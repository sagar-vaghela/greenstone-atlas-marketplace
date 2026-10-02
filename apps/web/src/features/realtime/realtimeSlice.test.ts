import { describe, expect, it } from "vitest";
import type { MarketplaceEvent } from "@atlas/types";
import reducer, { eventReceived } from "./realtimeSlice";

const auctionEvent = (type: MarketplaceEvent["type"]): MarketplaceEvent => ({
  id: "event-auction-1",
  type,
  timestamp: "2026-10-02T12:00:00.000Z",
  listingId: "listing-auction-1",
  payload:
    type === "bid.placed"
      ? {
          bid: {
            id: "bid-1",
            auctionId: "auction-1",
            listingId: "listing-auction-1",
            bidderId: "buyer-1",
            amount: 1100,
            currency: "AED",
            status: "winning",
            createdAt: "2026-10-02T12:00:00.000Z",
            version: 1,
          },
        }
      : {
          auction: {
            id: "auction-1",
            listingId: "listing-auction-1",
            sellerId: "seller-1",
            startsAt: "2026-10-02T11:00:00.000Z",
            endsAt: "2026-10-02T13:00:00.000Z",
            status: "active",
            startingPrice: 1000,
            minimumBidIncrement: 100,
            version: 1,
          },
        },
});

describe("realtime auction events", () => {
  it("surfaces auction lifecycle and bid notifications", () => {
    let state = reducer(undefined, { type: "@@init" });

    state = reducer(
      state,
      eventReceived({
        event: auctionEvent("auction.updated"),
        userId: "buyer-1",
      }),
    );
    expect(state.notification).toEqual({
      message: "Auction status updated.",
      severity: "info",
    });

    state = reducer(
      state,
      eventReceived({
        event: auctionEvent("bid.placed"),
        userId: "buyer-1",
      }),
    );
    expect(state.notification?.message).toBe("A new bid was placed.");
    expect(state.lastEventId).toBe("event-auction-1");
  });
});
