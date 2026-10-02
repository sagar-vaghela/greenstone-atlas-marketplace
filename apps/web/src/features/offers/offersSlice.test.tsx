import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  counterOffer as counterOfferRequest,
  createOffer as createOfferRequest,
  getOffersForListing,
  updateOfferStatus,
} from "../../api/offers";
import { eventReceived } from "../realtime/realtimeSlice";
import reducer, {
  counterOffer,
  createOffer,
  fetchOffers,
  offerAction,
} from "./offersSlice";

vi.mock("../../api/offers", () => ({
  counterOffer: vi.fn(),
  createOffer: vi.fn(),
  getOffersForListing: vi.fn(),
  updateOfferStatus: vi.fn(),
}));

const offer = (id = "offer-1", version = 1) =>
  ({
    id,
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    amount: 100,
    currency: "AED",
    status: "pending",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    version,
  }) as never;

const store = () => configureStore({ reducer: { offers: reducer } });

describe("offers slice thunks and reducers", () => {
  it("handles fetch success and ApiError rejection", async () => {
    vi.mocked(getOffersForListing).mockResolvedValueOnce([offer()]);
    const success = store();
    await success.dispatch(fetchOffers("listing-1"));
    expect(success.getState().offers).toMatchObject({
      listStatus: "succeeded",
      items: [offer()],
    });

    vi.mocked(getOffersForListing).mockRejectedValueOnce(new ApiError("denied", 403));
    const failure = store();
    await failure.dispatch(fetchOffers("listing-1"));
    expect(failure.getState().offers).toMatchObject({
      listStatus: "failed",
      error: "denied",
    });
  });

  it("covers create, action, and counter success and rejection branches", async () => {
    const app = store();
    vi.mocked(createOfferRequest).mockResolvedValueOnce(offer());
    await app.dispatch(
      createOffer({ listingId: "listing-1", amount: 100, currency: "AED" }),
    );
    expect(app.getState().offers.items).toEqual([offer()]);

    vi.mocked(updateOfferStatus).mockResolvedValueOnce(offer("offer-1", 2));
    await app.dispatch(offerAction({ id: "offer-1", status: "accepted" }));
    expect(app.getState().offers.items[0].version).toBe(2);

    vi.mocked(counterOfferRequest).mockRejectedValueOnce(new Error("nope"));
    await app.dispatch(counterOffer({ id: "offer-1", amount: 120, currency: "AED" }));
    expect(app.getState().offers.mutationError).toBe(
      "Unable to send the counter-offer.",
    );
  });

  it("upserts newer realtime offers and ignores unrelated payloads", () => {
    let state = reducer(undefined, { type: "init" });
    state = reducer(state, fetchOffers.fulfilled([offer()], "req", "listing-1"));
    const event = (value: ReturnType<typeof offer>) =>
      eventReceived({
        userId: "user-1",
        event: {
          id: "event-1",
          type: "offer.created",
          actorUserId: "buyer-1",
          timestamp: "2025-01-02T00:00:00Z",
          payload: { offer: value },
        } as never,
      });
    state = reducer(state, event(offer("offer-1", 2)));
    expect(state.items[0].version).toBe(2);
    state = reducer(state, event(offer("offer-1", 1)));
    expect(state.items[0].version).toBe(2);
    state = reducer(state, event(offer("offer-2", 1)));
    expect(state.items).toHaveLength(2);
    state = reducer(
      state,
      eventReceived({
        userId: "user-1",
        event: {
          id: "event-2",
          type: "message.created",
          actorUserId: "user-2",
          timestamp: "2025-01-02T00:00:00Z",
          payload: {},
        } as never,
      }),
    );
    expect(state.items).toHaveLength(2);
  });
});
