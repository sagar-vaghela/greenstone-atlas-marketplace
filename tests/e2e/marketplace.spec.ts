import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("guest users can browse and filter the marketplace", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find the watch that stays with you." }),
  ).toBeVisible();

  const listingCards = page.locator('a[href^="/listings/"]');
  await expect(listingCards.first()).toBeVisible();

  await page.getByLabel("Search the collection").fill("Rolex");
  await expect(page).toHaveURL(/search=Rolex/);

  await page.getByLabel("Category").click();
  await page.getByRole("option", { name: "luxury-watches" }).click();

  await page.getByLabel("Maximum price").fill("50000");

  await page.getByLabel("Sort").click();
  await page.getByRole("option", { name: "Price: low to high" }).click();
  await expect(page).toHaveURL(/sort=price_asc/);

  await page.getByRole("button", { name: /Clear filters/i }).click();
  await expect(page).toHaveURL(/\/$/);

  const rolexCards = page.locator('a[href^="/listings/"]');
  await expect(rolexCards.first()).toContainText(/Rolex|luxury-watches/i);
  await rolexCards.first().click();
  await expect(page).toHaveURL(/\/listings\//);

  await expect(
    page.getByRole("link", { name: "Back to marketplace" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to marketplace" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("authenticated shoppers are redirected to the login flow", async ({
  page,
}) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ftransactions/);
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Password").fill("buyer123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/transactions/);
});

test("chat shows live typing and sends on Enter while Shift+Enter inserts a newline", async ({
  page,
  browser,
}) => {
  const messageText = `typing live ${Date.now()}`;
  const firstLine = `first line ${Date.now()}`;
  const fillerToken = `scroll baseline ${Date.now()}`;
  const secondUnreadText = `second unread ${Date.now()}`;
  const scrollFiller = `${fillerToken}\n`.repeat(14);
  await signIn(page, "buyer");
  await page.goto("/");
  await page
    .locator('a[href^="/listings/"]:not([href="/listings/new"])')
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Message seller" }).click();
  await expect(page).toHaveURL(/\/messages\//);
  const conversationId = page.url().split("/").at(-1)!;

  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  try {
    await signIn(sellerPage, "seller");
    await sellerPage.goto(`/messages/${conversationId}`);

    const sellerComposer = sellerPage.getByRole("textbox", { name: "Message" });
    const messageHistory = page.getByRole("region", {
      name: "Message history",
    });
    const typingBubble = messageHistory.getByRole("status", {
      name: /is typing/,
    });
    const notificationButton = page.getByRole("button", {
      name: /Notifications,/,
    });
    const notificationLabelBefore = await notificationButton.getAttribute(
      "aria-label",
    );
    const messagesLink = page.getByRole("link", {
      name: /^Messages(?:,|$)/,
    });
    const messageCountBefore = Number(
      (await messagesLink.getAttribute("aria-label"))?.match(
        /, (\d+) unread/,
      )?.[1] ?? "0",
    );
    const notificationsBeforeCount = Number(
      notificationLabelBefore?.match(/, (\d+) unread/)?.[1] ?? "0",
    );
    await page.goto("/");
    await sellerComposer.fill(scrollFiller);
    await sellerComposer.press("Enter");
    await expect(sellerComposer).toHaveValue("");
    await expect(notificationButton).toHaveAttribute(
      "aria-label",
      `Notifications, ${notificationsBeforeCount + 1} unread`,
    );
    await expect(messagesLink).toHaveAttribute(
      "aria-label",
      `Messages, ${messageCountBefore + 1} unread ${messageCountBefore + 1 === 1 ? "message" : "messages"}`,
    );
    await sellerComposer.fill(secondUnreadText);
    await sellerComposer.press("Enter");
    await expect(sellerComposer).toHaveValue("");
    await expect(notificationButton).toHaveAttribute(
      "aria-label",
      `Notifications, ${notificationsBeforeCount + 1} unread`,
    );
    await expect(messagesLink).toHaveAttribute(
      "aria-label",
      `Messages, ${messageCountBefore + 2} unread messages`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawerNavigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    await expect(
      drawerNavigation.getByRole("link", {
        name: /^Messages, \d+ unread messages?$/,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto(`/messages/${conversationId}`);
    await expect(messageHistory).toBeVisible();
    await expect(notificationButton).toHaveAttribute(
      "aria-label",
      notificationLabelBefore!,
    );
    await expect(
      messageHistory.getByText(new RegExp(fillerToken)),
    ).toBeVisible();
    await expect(messageHistory.getByText(secondUnreadText)).toBeVisible();
    await messageHistory.evaluate((history) => {
      history.scrollTop = 0;
    });

    await sellerComposer.fill(messageText);
    await expect(typingBubble).toBeVisible();
    await expect
      .poll(() =>
        messageHistory.evaluate(
          (history) =>
            history.scrollTop + history.clientHeight >=
            history.scrollHeight - 1,
        ),
      )
      .toBe(true);
    expect(
      await typingBubble.evaluate((indicator) => {
        const history = indicator.closest('[aria-label="Message history"]');
        if (!history) return false;
        const indicatorRect = indicator.getBoundingClientRect();
        const historyRect = history.getBoundingClientRect();
        return (
          indicatorRect.top >= historyRect.top &&
          indicatorRect.bottom <= historyRect.bottom
        );
      }),
    ).toBe(true);
    await sellerComposer.fill("");
    await expect(typingBubble).toBeHidden();

    await sellerComposer.fill(messageText);
    await expect(typingBubble).toBeVisible();
    await sellerComposer.press("Enter");
    await expect(messageHistory.getByText(messageText)).toBeVisible();
    await expect(typingBubble).toBeHidden();

    await sellerComposer.fill(firstLine);
    await expect(typingBubble).toBeVisible();
    expect(
      await messageHistory.evaluate((history, latestText) => {
        const latestMessage = [...history.querySelectorAll("p")].find(
          (paragraph) => paragraph.textContent === latestText,
        );
        const indicator = history.querySelector(
          '[role="status"][aria-label$="is typing"]',
        );
        return Boolean(
          latestMessage &&
          indicator &&
          latestMessage.compareDocumentPosition(indicator) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }, messageText),
    ).toBe(true);
    await sellerComposer.press("Shift+Enter");
    await sellerComposer.type("second line");
    await expect(sellerComposer).toHaveValue(`${firstLine}\nsecond line`);
    await sellerComposer.press("Enter");
    await expect(
      messageHistory.getByText(`${firstLine}\nsecond line`),
    ).toBeVisible();
    await expect(typingBubble).toBeHidden();

    const buyerComposer = page.getByRole("textbox", { name: "Message" });
    const ownMessageText = `own message ${Date.now()}`;
    await messageHistory.evaluate((history) => {
      history.scrollTop = 0;
    });
    await buyerComposer.fill(ownMessageText);
    await buyerComposer.press("Enter");
    await expect(messageHistory.getByText(ownMessageText)).toBeVisible();
    await expect
      .poll(() =>
        messageHistory.evaluate(
          (history) =>
            history.scrollTop + history.clientHeight >=
            history.scrollHeight - 1,
        ),
      )
      .toBe(true);
  } finally {
    await sellerContext.close();
  }
});
