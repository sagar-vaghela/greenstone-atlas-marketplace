import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp, inject, login } from "./helpers.js";

describe("auction API", () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = await makeApp(); });
  afterEach(async () => { await app.close(); });

  it("creates auctions, enforces increments, and accepts the winner", async () => {
    const seller = await login(app, "seller@example.com", "seller123");
    const buyer = await login(app, "buyer@example.com", "buyer123");
    const listing = await inject(app, {
      method: "POST", url: "/listings", payload: {
        title: "Auction watch", description: "Auction item", price: 1000,
        currency: "AED", category: "luxury-watches", saleMode: "auction", images: [],
      },
    }, seller);
    const auction = await inject(app, {
      method: "POST", url: `/listings/${listing.json().id}/auction`,
      payload: {
        startsAt: new Date(Date.now() - 1000).toISOString(),
        endsAt: new Date(Date.now() + 60_000).toISOString(),
        startingPrice: 1000, minimumBidIncrement: 100,
      },
    }, seller);
    expect(auction.statusCode).toBe(201);
    const tooLow = await inject(app, {
      method: "POST", url: `/auctions/${auction.json().id}/bids`,
      payload: { amount: 1050, currency: "AED" },
    }, buyer);
    expect(tooLow.statusCode).toBe(409);
    expect(tooLow.json().error.code).toBe("BID_TOO_LOW");
    const bid = await inject(app, {
      method: "POST", url: `/auctions/${auction.json().id}/bids`,
      payload: { amount: 1100, currency: "AED" },
    }, buyer);
    expect(bid.statusCode).toBe(201);
    expect((await inject(app, {
      method: "POST", url: `/auctions/${auction.json().id}/bids`,
      payload: { amount: 1100, currency: "AED" },
    }, seller)).statusCode).toBe(403);
    expect((await inject(app, {
      method: "POST", url: `/auctions/${auction.json().id}/end`,
    }, seller)).statusCode).toBe(200);
    expect((await inject(app, {
      method: "POST", url: `/auctions/${auction.json().id}/accept-winning-bid`,
    }, seller)).statusCode).toBe(200);
  });
});
