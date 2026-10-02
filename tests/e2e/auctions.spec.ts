import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:3000";

async function api(
  page: Page,
  path: string,
  method: "POST",
  body?: Record<string, unknown>,
) {
  return page.evaluate(
    async ({ apiUrl, path, method, body }) => {
      const response = await fetch(`${apiUrl}${path}`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return {
        status: response.status,
        body: (await response.json()) as Record<string, unknown>,
      };
    },
    { apiUrl, path, method, body },
  );
}

test("seller and buyer complete an auction through authenticated browser requests", async ({
  page,
  browser,
}) => {
  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  const title = `Playwright auction ${Date.now()}`;

  try {
    await signIn(sellerPage, "seller2");
    const listingResponse = await api(sellerPage, "/listings", "POST", {
      title,
      description: "Auction test listing.",
      brand: "Omega",
      model: "Speedmaster",
      referenceNumber: "311.30.42.30.01.005",
      condition: "Excellent",
      location: "Dubai, UAE",
      price: 1000,
      currency: "AED",
      category: "luxury-watches",
      saleMode: "auction",
      images: [],
    });
    expect(listingResponse.status).toBe(201);
    const listingId = String(listingResponse.body.id);
    await sellerPage.goto(`/listings/${listingId}`);
    await expect(sellerPage.getByRole("heading", { name: title })).toBeVisible();
    const auctionResponse = await api(
      sellerPage,
      `/listings/${listingId}/auction`,
      "POST",
      {
        startsAt: new Date(Date.now() - 1_000).toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
        startingPrice: 1000,
        minimumBidIncrement: 100,
      },
    );
    expect(auctionResponse.status).toBe(201);
    const auctionId = String(auctionResponse.body.id);

    await signIn(page, "buyer");
    await page.goto(`/listings/${listingId}`);
    const tooLow = await api(page, `/auctions/${auctionId}/bids`, "POST", {
      amount: 1050,
      currency: "AED",
    });
    expect(tooLow).toMatchObject({
      status: 409,
      body: { error: { code: "BID_TOO_LOW" } },
    });

    const bid = await api(page, `/auctions/${auctionId}/bids`, "POST", {
      amount: 1100,
      currency: "AED",
    });
    expect(bid.status).toBe(201);

    const sellerBid = await api(sellerPage, `/auctions/${auctionId}/bids`, "POST", {
      amount: 1200,
      currency: "AED",
    });
    expect(sellerBid).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });

    expect((await api(sellerPage, `/auctions/${auctionId}/end`, "POST")).status).toBe(
      200,
    );
    expect(
      (await api(sellerPage, `/auctions/${auctionId}/accept-winning-bid`, "POST"))
        .status,
    ).toBe(200);
  } finally {
    await sellerContext.close();
  }
});
