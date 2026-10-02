import { describe, expect, it } from "vitest";
import {
  qaConversations,
  qaListings,
  qaMessages,
  qaNotifications,
  qaOffers,
  qaSellerProfiles,
  qaTransactions,
  qaUsers,
} from "../apps/api/src/seed-marketplace-data.js";

describe("marketplace seed fixtures", () => {
  it("uses unique test account identities", () => {
    expect(new Set(qaUsers.map((user) => user.id)).size).toBe(qaUsers.length);
    expect(new Set(qaUsers.map((user) => user.email)).size).toBe(qaUsers.length);
    expect(qaUsers.every((user) => user.id.startsWith("qa-"))).toBe(true);
    expect(
      qaUsers.every((user) => user.email.endsWith("@atlas-marketplace.test")),
    ).toBe(true);
    expect(qaSellerProfiles.every((profile) => profile.userId.startsWith("qa-seller-"))).toBe(
      true,
    );
  });

  it("links offers, transactions, and listings to valid workflow participants", () => {
    const usersById = new Map(qaUsers.map((user) => [user.id, user]));
    const listingsById = new Map(qaListings.map((listing) => [listing.id, listing]));
    const offersById = new Map(qaOffers.map((offer) => [offer.id, offer]));

    expect(new Set(qaOffers.map((offer) => offer.status))).toEqual(
      new Set(["pending", "countered", "accepted", "rejected", "withdrawn", "expired"]),
    );

    for (const offer of qaOffers) {
      expect(listingsById.get(offer.listingId)?.sellerId).toBe(offer.sellerId);
      expect(usersById.get(offer.buyerId)?.role).toBe("buyer");
      expect(usersById.get(offer.sellerId)?.role).toBe("seller");
      expect(offer.buyerId).not.toBe(offer.sellerId);
      if (offer.parentOfferId) {
        const parent = offersById.get(offer.parentOfferId);
        expect(parent?.status).toBe("countered");
        expect(parent?.buyerId).toBe(offer.buyerId);
        expect(parent?.listingId).toBe(offer.listingId);
      }
    }

    for (const transaction of qaTransactions) {
      const listing = listingsById.get(transaction.listingId);
      const offer = offersById.get(transaction.offerId);
      expect(listing?.status).toBe("sold");
      expect(offer?.status).toBe("accepted");
      expect(offer?.listingId).toBe(transaction.listingId);
      expect(offer?.buyerId).toBe(transaction.buyerId);
      expect(offer?.sellerId).toBe(transaction.sellerId);
    }

    expect(new Set(qaTransactions.map((item) => item.status))).toEqual(
      new Set(["pending_payment", "paid", "completed", "cancelled", "disputed"]),
    );
    expect(new Set(qaTransactions.map((item) => item.paymentStatus))).toEqual(
      new Set(["pending", "failed", "paid", "refunded"]),
    );
    expect(new Set(qaTransactions.map((item) => item.fulfilmentStatus))).toEqual(
      new Set(["pending", "shipped", "delivered"]),
    );
    expect(qaListings.some((listing) => listing.status === "draft")).toBe(true);
  });

  it("links seeded messages and notifications to conversations and users", () => {
    const usersById = new Set(qaUsers.map((user) => user.id));
    const listingsById = new Set(qaListings.map((listing) => listing.id));
    const conversationsById = new Map(
      qaConversations.map((conversation) => [conversation.id, conversation]),
    );

    for (const conversation of qaConversations) {
      expect(listingsById.has(conversation.listingId)).toBe(true);
      expect(usersById.has(conversation.buyerId)).toBe(true);
      expect(usersById.has(conversation.sellerId)).toBe(true);
    }

    for (const message of qaMessages) {
      const conversation = conversationsById.get(message.conversationId);
      expect(conversation).toBeDefined();
      expect([conversation?.buyerId, conversation?.sellerId]).toContain(
        message.senderId,
      );
    }

    for (const notification of qaNotifications) {
      expect(usersById.has(notification.userId)).toBe(true);
    }
    expect(qaMessages.some((message) => !message.readAt)).toBe(true);
    expect(qaMessages.some((message) => Boolean(message.readAt))).toBe(true);
    expect(qaNotifications.some((notification) => !notification.readAt)).toBe(true);
    expect(qaNotifications.some((notification) => Boolean(notification.readAt))).toBe(
      true,
    );
  });
});
