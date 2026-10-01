import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("seller can create a listing and mark it as sold", async ({ page }) => {
  const title = `Playwright seller listing ${Date.now()}`;

  await signIn(page, "seller");

  await page.goto("/listings/new");
  await expect(
    page.getByRole("heading", { name: "Create a listing" }),
  ).toBeVisible();

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(
    "A carefully sourced timepiece with strong provenance and a clean bracelet.",
  );
  await page.getByLabel("Brand").fill("Omega");
  await page.getByLabel("Model").fill("Speedmaster");
  await page.getByLabel("Reference number").fill("311.30.42.30.01.005");
  await page.getByLabel("Condition").fill("Excellent");
  await page.getByLabel("Year").fill("2022");
  await page.getByLabel("Location").fill("Dubai, UAE");
  await page.getByLabel("Price").fill("22000");
  await page.getByLabel("Currency").fill("AED");
  await page.getByLabel("Category").fill("luxury-watches");
  await page.getByLabel("Image URL").fill(
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
  );
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Create listing" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit listing" })).toBeVisible();

  await page.getByRole("button", { name: "Mark as sold" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mark as sold" }).click();

  await expect(
    page.getByText(/listing status updated to sold/i),
  ).toBeVisible();
});
