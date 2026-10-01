import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("buyer can validate and submit an offer", async ({ page }) => {
  await signIn(page, "buyer");

  await page.goto("/listings/listing-rolex-daytona-116500ln");

  await expect(
    page.getByRole("heading", { name: "Rolex Daytona 116500LN" }),
  ).toBeVisible();

  const amountInput = page.getByLabel("Amount (AED)");
  await amountInput.fill("0");
  await expect(page.getByText("Enter a positive amount.")).toBeVisible();

  await amountInput.fill("25000");
  await page.getByRole("button", { name: "Make offer" }).click();

  await expect(
    page
      .getByRole("region", { name: "Offers for this watch" })
      .getByText("Your offer", { exact: true })
      .first(),
  ).toBeVisible();
});
