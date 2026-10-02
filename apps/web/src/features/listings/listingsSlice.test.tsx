import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  createListing as createListingRequest,
  getListingById,
  getListings,
  updateListing as updateListingRequest,
  updateListingStatus as updateListingStatusRequest,
} from "../../api/listings";
import { eventReceived } from "../realtime/realtimeSlice";
import reducer, {
  createListing,
  fetchListingById,
  fetchListings,
  resetCreateState,
  resetUpdateState,
  updateListing,
  updateListingStatus,
} from "./listingsSlice";

vi.mock("../../api/listings", () => ({
  createListing: vi.fn(),
  getListingById: vi.fn(),
  getListings: vi.fn(),
  updateListing: vi.fn(),
  updateListingStatus: vi.fn(),
}));

const listing = (id = "listing-1", version = 1) =>
  ({
    id,
    sellerId: "seller-1",
    title: `Listing ${id}`,
    description: "Description",
    price: 100,
    currency: "AED",
    category: "other",
    images: [],
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    version,
  }) as never;

const store = () => configureStore({ reducer: { listings: reducer } });

describe("listings slice thunks and reducers", () => {
  it("handles listing fetch success and rejection", async () => {
    vi.mocked(getListings).mockResolvedValueOnce([listing()]);
    const success = store();
    await success.dispatch(fetchListings({ search: "chair" }));
    expect(success.getState().listings).toMatchObject({
      listStatus: "succeeded",
      items: [listing()],
      error: null,
    });

    vi.mocked(getListings).mockRejectedValueOnce(new Error("offline"));
    const failure = store();
    await failure.dispatch(fetchListings());
    expect(failure.getState().listings).toMatchObject({
      listStatus: "failed",
      error: "Unable to load listings.",
    });
  });

  it("maps detail, create, update, and status errors and success", async () => {
    vi.mocked(getListingById).mockRejectedValueOnce(new ApiError("missing", 404));
    const detail = store();
    await detail.dispatch(fetchListingById("missing"));
    expect(detail.getState().listings.error).toBe("Listing not found");

    vi.mocked(getListingById).mockResolvedValueOnce(listing());
    await detail.dispatch(fetchListingById("listing-1"));
    expect(detail.getState().listings.selectedListing).toEqual(listing());

    vi.mocked(createListingRequest).mockResolvedValueOnce(listing("new"));
    await detail.dispatch(createListing({} as never));
    expect(detail.getState().listings.items).toEqual([listing("new")]);
    detail.dispatch(resetCreateState());
    expect(detail.getState().listings.createStatus).toBe("idle");

    vi.mocked(updateListingRequest).mockResolvedValueOnce(listing("new", 2));
    await detail.dispatch(updateListing({ id: "new", input: {} as never }));
    expect(detail.getState().listings.items[0].version).toBe(2);
    detail.dispatch(resetUpdateState());
    expect(detail.getState().listings.updateStatus).toBe("idle");

    vi.mocked(updateListingStatusRequest).mockRejectedValueOnce(
      new ApiError("conflict", 409),
    );
    await detail.dispatch(updateListingStatus({ id: "new", status: "sold" as never }));
    expect(detail.getState().listings.statusUpdateError).toBe(
      "This listing status can no longer be changed.",
    );
  });

  it("accepts only newer realtime listings and updates selected detail", () => {
    let state = reducer(undefined, { type: "init" });
    state = reducer(state, fetchListings.fulfilled([listing()], "req", {}));
    const event = (value: ReturnType<typeof listing>) =>
      eventReceived({
        userId: "user-1",
        event: {
          id: "event-1",
          type: "listing.status_changed",
          actorUserId: "seller-1",
          timestamp: "2025-01-02T00:00:00Z",
          payload: { listing: value },
        } as never,
      });
    state = reducer(state, event(listing("listing-1", 2)));
    expect(state.items[0].version).toBe(2);
    state = reducer(state, event(listing("listing-1", 1)));
    expect(state.items[0].version).toBe(2);
    state = reducer(state, event(listing("other", 1)));
    expect(state.items).toHaveLength(1);
  });
});
