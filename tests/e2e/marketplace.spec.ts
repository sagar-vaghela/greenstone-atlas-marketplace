import { expect, test } from "@playwright/test";

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

test("authenticated shoppers are redirected to the login flow", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ftransactions/);
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Password").fill("buyer123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/transactions/);
});
