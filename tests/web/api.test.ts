import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("../../apps/web/src/api/client", () => ({ request }));

import {
  createListing,
  getListingById,
  getListings,
  updateListing,
  updateListingStatus,
} from "../../apps/web/src/api/listings";
import {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
  setConversationTyping,
} from "../../apps/web/src/api/messaging";
import {
  getCurrentSellerProfile,
  getSellerListings,
  getSellerProfile,
  updateSellerProfile,
} from "../../apps/web/src/api/sellers";
import {
  counterOffer,
  createOffer,
  getOffer,
  getOffersForListing,
  updateOfferStatus,
} from "../../apps/web/src/api/offers";
import {
  cancelTransaction,
  completeTransaction,
  createPaymentIntent,
  deliverTransaction,
  disputeTransaction,
  getMyTransactions,
  getTransactionById,
  shipTransaction,
} from "../../apps/web/src/api/transactions";

beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (_path: string) => ({}));
});

describe("listing API helpers", () => {
  it("serializes listing filters and unwraps items", async () => {
    request.mockResolvedValue({ items: ["listing"] });
    await expect(
      getListings({
        search: "chair",
        category: "furniture",
        minPrice: 10,
        maxPrice: 20,
        sort: "price_asc",
      }),
    ).resolves.toEqual(["listing"]);
    expect(request).toHaveBeenCalledWith(
      "/listings?search=chair&category=furniture&minPrice=10&maxPrice=20&sort=price_asc",
    );
    await getListings();
    expect(request).toHaveBeenLastCalledWith("/listings");
  });

  it("encodes IDs and sends listing mutations", async () => {
    await getListingById("a/b");
    expect(request).toHaveBeenLastCalledWith("/listings/a%2Fb");
    await createListing({ title: "Chair" } as never);
    expect(request).toHaveBeenLastCalledWith("/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Chair" }),
    });
    await updateListing("a/b", { title: "Desk" } as never);
    expect(request).toHaveBeenLastCalledWith("/listings/a%2Fb", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Desk" }),
    });
    await updateListingStatus("a/b", "active" as never);
    expect(request).toHaveBeenLastCalledWith("/listings/a%2Fb/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
  });
});

describe("messaging API helpers", () => {
  it("handles conversation and message operations", async () => {
    request.mockResolvedValueOnce({ items: ["conversation"] });
    await expect(getConversations()).resolves.toEqual(["conversation"]);
    await createConversation("listing/1");
    expect(request).toHaveBeenLastCalledWith("/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing/1" }),
    });
    await getConversation("conversation/1");
    expect(request).toHaveBeenLastCalledWith("/conversations/conversation%2F1");
    await getMessages("conversation/1", "cursor");
    expect(request).toHaveBeenLastCalledWith(
      "/conversations/conversation%2F1/messages?limit=50&before=cursor",
    );
    await getMessages("conversation/1");
    expect(request).toHaveBeenLastCalledWith(
      "/conversations/conversation%2F1/messages?limit=50",
    );
    await sendMessage("conversation/1", "Hello");
    expect(request).toHaveBeenLastCalledWith(
      "/conversations/conversation%2F1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Hello" }),
      }),
    );
    await markConversationRead("conversation/1");
    expect(request).toHaveBeenLastCalledWith("/conversations/conversation%2F1/read", {
      method: "POST",
    });
    request.mockResolvedValueOnce({ ignored: true });
    await expect(
      setConversationTyping("conversation/1", true),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenLastCalledWith("/conversations/conversation%2F1/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTyping: true }),
    });
  });
});

describe("seller, offer, and transaction API helpers", () => {
  it("unwraps seller and offer collections and sends their mutations", async () => {
    request.mockResolvedValueOnce({ items: ["listing"] });
    await expect(getSellerListings("seller/1")).resolves.toEqual(["listing"]);
    expect(request).toHaveBeenLastCalledWith("/sellers/seller%2F1/listings");
    await getSellerProfile("seller/1");
    expect(request).toHaveBeenLastCalledWith("/sellers/seller%2F1");
    await getCurrentSellerProfile();
    expect(request).toHaveBeenLastCalledWith("/me/seller-profile");
    await updateSellerProfile({ bio: "Hello" });
    expect(request).toHaveBeenLastCalledWith("/me/seller-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: "Hello" }),
    });

    request.mockResolvedValueOnce({ items: ["offer"] });
    await expect(getOffersForListing("listing/1")).resolves.toEqual(["offer"]);
    await getOffer("offer/1");
    await createOffer("listing/1", { amount: 10, currency: "AED" });
    expect(request).toHaveBeenLastCalledWith("/listings/listing%2F1/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10, currency: "AED" }),
    });
    request.mockResolvedValueOnce({ offer: "updated" });
    await expect(updateOfferStatus("offer/1", "accepted")).resolves.toBe("updated");
    request.mockResolvedValueOnce({ id: "updated" });
    await expect(updateOfferStatus("offer/1", "rejected")).resolves.toEqual({
      id: "updated",
    });
    await counterOffer("offer/1", { amount: 12, currency: "AED" });
  });

  it("covers transaction reads and lifecycle requests", async () => {
    request.mockResolvedValueOnce({ items: ["transaction"] });
    await expect(getMyTransactions()).resolves.toEqual(["transaction"]);
    await getTransactionById("txn/1");
    await createPaymentIntent("txn/1", "key-1");
    expect(request).toHaveBeenLastCalledWith("/transactions/txn%2F1/payment-intent", {
      method: "POST",
      headers: { "Idempotency-Key": "key-1" },
    });
    for (const operation of [
      shipTransaction,
      deliverTransaction,
      completeTransaction,
      cancelTransaction,
    ]) {
      await operation("txn/1");
    }
    await disputeTransaction("txn/1", {
      reason: "not_as_described" as never,
      description: "Damaged",
    });
    expect(request).toHaveBeenLastCalledWith("/transactions/txn%2F1/dispute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "not_as_described", description: "Damaged" }),
    });
  });
});
