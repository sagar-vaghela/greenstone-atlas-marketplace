import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

const authenticatedDestinations = [
  { label: "Marketplace", path: "/" },
  { label: "Messages", path: "/messages" },
  { label: "Notifications", path: "/notifications" },
  { label: "Transactions", path: "/transactions" },
  { label: "List a watch", path: "/listings/new" },
  { label: "Seller profile", path: "/profile" },
];

test("guest navigation keeps public browsing separate from account actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const compactMenuButton = page.getByRole("button", {
    name: "Open navigation menu",
  });
  await compactMenuButton.hover();
  await expect(compactMenuButton).toHaveCSS(
    "background-color",
    "rgba(255, 255, 255, 0.12)",
  );
  await compactMenuButton.click();

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(navigation).toBeVisible();
  expect(
    await navigation
      .locator("section")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("aria-label")),
      ),
  ).toEqual(["Browse", "Account"]);
  expect(
    await navigation
      .locator("a")
      .evaluateAll((links) => links.map((link) => new URL(link.href).pathname)),
  ).toEqual(["/", "/login", "/register"]);
  await expect(navigation.getByRole("link", { name: "Messages" })).toHaveCount(
    0,
  );
  await expect(
    navigation.getByRole("link", { name: "List a watch" }),
  ).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
  const signInLink = page.getByRole("link", { name: "Sign in" });
  await signInLink.hover();
  await expect(signInLink).toHaveCSS(
    "background-color",
    "rgba(255, 255, 255, 0.12)",
  );
  expect(
    await page.locator("header").evaluate((header) => {
      const navigation = header.querySelector(
        'nav[aria-label="Primary navigation"]',
      );
      const signIn = [...header.querySelectorAll("a")].find(
        (link) => link.textContent?.trim() === "Sign in",
      );
      const createAccount = [...header.querySelectorAll("a")].find(
        (link) => link.textContent?.trim() === "Create account",
      );
      return Boolean(
        navigation &&
        signIn &&
        createAccount &&
        navigation.compareDocumentPosition(signIn) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        signIn.compareDocumentPosition(createAccount) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
});

test("mobile navigation exposes every destination and supports keyboard dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "buyer");

  for (const width of [390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const menuButton = page.getByRole("button", {
      name: "Open navigation menu",
    });
    await expect(menuButton).toBeVisible();
    if (width === 390) {
      const compactNotifications = page.getByRole("link", {
        name: /Notifications/,
      });
      await compactNotifications.hover();
      await expect(compactNotifications).toHaveCSS(
        "background-color",
        "rgba(255, 255, 255, 0.12)",
      );
    }
    await menuButton.click();

    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    await expect(navigation).toBeVisible();
    expect(
      await navigation
        .locator("section")
        .evaluateAll((sections) =>
          sections.map((section) => section.getAttribute("aria-label")),
        ),
    ).toEqual(["Browse", "Workspace", "Selling", "Account"]);
    expect(
      await navigation
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => new URL(link.href).pathname),
        ),
    ).toEqual([
      "/",
      "/messages",
      "/notifications",
      "/transactions",
      "/listings/new",
      "/profile",
    ]);
    for (const destination of authenticatedDestinations) {
      await expect(
        navigation.getByRole("link", {
          name:
            destination.path === "/messages"
              ? /^Messages(?:,|$)/
              : destination.label,
        }),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    const overflowingWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowingWidth).toBeLessThanOrEqual(1);

    if (width === 390) {
      await page.keyboard.press("Escape");
      await expect(navigation).toBeHidden();
      await menuButton.click();
      await expect(navigation).toBeVisible();
      await page.mouse.click(width - 10, 400);
      await expect(navigation).toBeHidden();
    }

    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    if (width === 390) {
      for (const destination of authenticatedDestinations.filter(
        (item) => item.path !== "/profile",
      )) {
        await menuButton.click();
        await expect(navigation).toBeVisible();
        const destinationLink = navigation.getByRole("link", {
          name:
            destination.path === "/messages"
              ? /^Messages(?:,|$)/
              : destination.label,
        });
        await expect(destinationLink).toBeVisible();
        await destinationLink.click();
        await expect(page).toHaveURL(
          new RegExp(`${destination.path.replaceAll("/", "\\/")}$`),
        );
        await expect(navigation).toBeHidden();
        if (destination.path === "/listings/new") {
          await page.getByRole("link", { name: "Back to marketplace" }).click();
        }
      }
    }
  }

  await page.goto("/transactions");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ftransactions/);
});

test("desktop navigation keeps primary links and account actions available", async ({
  page,
}) => {
  await signIn(page, "buyer");

  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const primaryNavigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    await expect(primaryNavigation).toBeVisible();
    expect(
      await primaryNavigation
        .locator("a")
        .evaluateAll((links) =>
          links.map((link) => new URL(link.href).pathname),
        ),
    ).toEqual(["/", "/messages", "/transactions"]);
    await expect(page.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Messages(?:,|$)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Transactions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "List a watch" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Notifications/ }),
    ).toBeVisible();
    const messagesLink = primaryNavigation.getByRole("link", {
      name: /^Messages(?:,|$)/,
    });
    await messagesLink.hover();
    await expect(messagesLink).toHaveCSS(
      "background-color",
      "rgba(255, 255, 255, 0.12)",
    );
    const accountButton = page.getByRole("button", {
      name: "Open account menu",
    });
    await accountButton.hover();
    await expect(accountButton).toHaveCSS(
      "background-color",
      "rgba(255, 255, 255, 0.12)",
    );
    expect(
      await page.locator("header").evaluate((header) => {
        const navigation = header.querySelector(
          'nav[aria-label="Primary navigation"]',
        );
        const listWatch = [...header.querySelectorAll("a")].find(
          (link) => link.textContent?.trim() === "List a watch",
        );
        const notifications = header.querySelector(
          'button[aria-label^="Notifications,"]',
        );
        const account = header.querySelector(
          'button[aria-label="Open account menu"]',
        );
        return Boolean(
          navigation &&
          listWatch &&
          notifications &&
          account &&
          navigation.compareDocumentPosition(listWatch) &
            Node.DOCUMENT_POSITION_FOLLOWING &&
          listWatch.compareDocumentPosition(notifications) &
            Node.DOCUMENT_POSITION_FOLLOWING &&
          notifications.compareDocumentPosition(account) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
    ).toBe(true);

    const overflowingWidth = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowingWidth).toBeLessThanOrEqual(1);
  }

  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Seller profile" }),
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Seller profile" }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
