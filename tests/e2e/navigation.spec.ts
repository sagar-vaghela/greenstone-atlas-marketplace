import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

const authenticatedDestinations = [
  { label: "Marketplace", path: "/" },
  { label: "List a watch", path: "/listings/new" },
  { label: "Messages", path: "/messages" },
  { label: "Notifications", path: "/notifications" },
  { label: "Transactions", path: "/transactions" },
  { label: "Seller profile", path: "/profile" },
];

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
    await menuButton.click();

    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    await expect(navigation).toBeVisible();
    for (const destination of authenticatedDestinations) {
      await expect(
        navigation.getByRole("link", { name: destination.label }),
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
      for (const destination of authenticatedDestinations) {
        await menuButton.click();
        await expect(navigation).toBeVisible();
        const destinationLink = navigation.getByRole("link", {
          name: destination.label,
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

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("desktop navigation keeps primary links and account actions available", async ({
  page,
}) => {
  await signIn(page, "buyer");

  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Transactions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "List a watch" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Notifications/ }),
    ).toBeVisible();

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
});
