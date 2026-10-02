import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("buyer can validate and submit an offer", async ({ page }) => {
  await signIn(page, "buyer");

  await page.goto("/listings/listing-rolex-submariner-126610ln");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

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
  await expect(
    page.getByRole("heading", { name: "How this marketplace works" }),
  ).toBeVisible();
  const offerHistory = page.getByRole("region", { name: "Offer history" });
  await expect(offerHistory).toBeVisible();
  await expect
    .poll(() =>
      offerHistory.evaluate((element) => ({
        overflowY: getComputedStyle(element).overflowY,
        maxHeight: getComputedStyle(element).maxHeight,
      })),
    )
    .toMatchObject({ overflowY: "auto", maxHeight: "520px" });
});

test("seller counter can be accepted and payment dialog is shown", async ({
  page,
  browser,
}) => {
  const listingTitle = `Playwright counter flow ${Date.now()}`;
  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  try {
    await signIn(sellerPage, "seller2");
    await sellerPage.goto("/listings/new");
    await sellerPage.getByLabel("Title").fill(listingTitle);
    await sellerPage.getByLabel("Description").fill("Counter offer test listing.");
    await sellerPage.getByLabel("Brand").fill("Omega");
    await sellerPage.getByLabel("Model").fill("Speedmaster");
    await sellerPage.getByLabel("Reference number").fill("311.30.42.30.01.005");
    await sellerPage.getByLabel("Condition").fill("Excellent");
    await sellerPage.getByLabel("Year").fill("2022");
    await sellerPage.getByLabel("Location").fill("Dubai, UAE");
    await sellerPage.getByLabel("Price").fill("40000");
    await sellerPage.getByLabel("Currency").fill("AED");
    await sellerPage.getByLabel("Category").fill("luxury-watches");
    await sellerPage
      .getByLabel("Image URL")
      .fill(
        "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80",
      );
    await sellerPage.getByRole("button", { name: "Add" }).click();
    await sellerPage.getByRole("button", { name: "Create listing" }).click();
    await expect(sellerPage.getByRole("heading", { name: listingTitle })).toBeVisible();
    const listingId = new URL(sellerPage.url()).pathname.split("/").at(-1)!;

    await signIn(page, "buyer");
    await page.goto(`/listings/${listingId}`);
    await page.getByLabel("Amount (AED)").fill("27123");
    await page.getByRole("button", { name: "Make offer" }).click();

    await sellerPage.goto(`/listings/${listingId}`);
    const offerRegion = sellerPage.getByRole("region", {
      name: "Offers for this watch",
    });
    const buyerOffer = offerRegion
      .locator(".MuiCard-root")
      .filter({ hasText: "27,123" })
      .first();
    await expect(buyerOffer.getByText("Buyer offer", { exact: true })).toBeVisible();
    await buyerOffer.getByRole("button", { name: "Counter" }).click();
    await sellerPage.getByLabel("Counter amount (AED)").fill("28000");
    await sellerPage.getByRole("button", { name: "Send counter" }).click();

    await expect(
      page
        .getByRole("region", { name: "Offers for this watch" })
        .getByText("Seller countered your offer", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Accept counter" }).click();

    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
    const transactionCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "Payment: pending" })
      .first();
    await expect(transactionCard).toBeVisible();
    await transactionCard.getByRole("link", { name: "View transaction" }).click();
    await expect(page.getByText("Pending payment", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(
      page.getByText(
        /Secure test payment|Payment received\. Waiting for seller to ship\./,
      ),
    ).toBeVisible();
  } finally {
    await sellerContext.close();
  }
});
