import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

async function expectNoHorizontalOverflow(
  page: Page,
  path: string,
  width: number,
) {
  const overflow = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - window.innerWidth,
  );
  expect(overflow, `${path} overflows at ${width}px`).toBeLessThanOrEqual(1);
}

test("marketplace and account routes fit every requested viewport", async ({
  page,
}) => {
  await page.setViewportSize(viewports[0]);
  await signIn(page, "buyer");
  await page.goto("/");
  const listingLink = page.locator('a[href^="/listings/"]').first();
  await expect(listingLink).toBeVisible();
  const listingPath = await listingLink.getAttribute("href");
  const sellerPath = await page
    .locator('a[href^="/sellers/"]')
    .first()
    .getAttribute("href");
  expect(listingPath).toBeTruthy();
  expect(sellerPath).toBeTruthy();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of [
      "/",
      listingPath!,
      sellerPath!,
      "/listings/new",
      "/profile",
      "/messages",
      "/notifications",
      "/transactions",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalOverflow(page, path, viewport.width);
    }
  }
});

test("listing lightbox stays within the phone viewport and closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  await page.locator('a[href^="/listings/"]').first().click();
  const openGallery = page.getByRole("button", {
    name: /Open .* in full screen/,
  });
  await expect(openGallery).toBeVisible();
  await openGallery.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dialogWidth = await dialog.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(dialogWidth).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("authentication forms fit mobile and desktop widths", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalOverflow(page, path, viewport.width);
    }
  }
});
