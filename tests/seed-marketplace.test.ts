import { describe, expect, it } from "vitest";
import {
  demoPassword,
  demoConversations,
  demoListings,
  demoMessages,
  demoNotifications,
  demoOffers,
  demoSellerProfiles,
  demoTransactions,
  demoUsers,
} from "../apps/api/src/seed-marketplace-data.js";

describe("marketplace demo seed data", () => {
  it("includes the original demo accounts and public product photography", () => {
    expect(demoUsers.map(({ email }) => email)).toContain("seller@example.com");
    expect(demoUsers.map(({ email }) => email)).toContain("buyer@example.com");
    expect(demoUsers.find(({ email }) => email === "seller@example.com")?.password)
      .toBe(demoPassword.seller);
    expect(demoUsers.find(({ email }) => email === "buyer@example.com")?.password)
      .toBe(demoPassword.buyer);
    expect(demoUsers.find(({ id }) => id === "demo-seller")?.role).toBe("seller");
    expect(demoUsers.find(({ id }) => id === "demo-buyer")?.role).toBe("buyer");
    expect(demoSellerProfiles.map(({ userId }) => userId)).toContain("demo-seller");

    expect(demoListings.length).toBeGreaterThanOrEqual(10);
    expect(
      demoListings.every((listing) =>
        listing.images.every((image) =>
          image.url.startsWith("https://images.unsplash.com/"),
        ),
      ),
    ).toBe(true);
    expect(
      demoListings.some((listing) =>
        listing.title.includes("Rolex Submariner Date"),
      ),
    ).toBe(true);
    expect(
      demoListings.every(
        (listing) =>
          !listing.title.toLowerCase().includes("fixture") &&
          !listing.title.toLowerCase().includes("qa"),
      ),
    ).toBe(true);
  });

  it("links all offer and transaction workflows to real demo accounts/listings", () => {
    const usersById = new Map(demoUsers.map((user) => [user.id, user]));
    const listingsById = new Map(
      demoListings.map((listing) => [listing.id, listing]),
    );
    const offersById = new Map(demoOffers.map((offer) => [offer.id, offer]));

    expect(new Set(demoOffers.map((offer) => offer.status))).toEqual(
      new Set([
        "pending",
        "countered",
        "accepted",
        "rejected",
        "withdrawn",
        "expired",
      ]),
    );

    for (const offer of demoOffers) {
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

    for (const transaction of demoTransactions) {
      const listing = listingsById.get(transaction.listingId);
      const offer = offersById.get(transaction.offerId);
      expect(listing?.status).toBe("sold");
      expect(offer?.status).toBe("accepted");
      expect(offer?.listingId).toBe(transaction.listingId);
      expect(offer?.buyerId).toBe(transaction.buyerId);
      expect(offer?.sellerId).toBe(transaction.sellerId);
    }

    expect(new Set(demoTransactions.map((item) => item.status))).toEqual(
      new Set(["pending_payment", "paid", "completed", "cancelled", "disputed"]),
    );
    expect(new Set(demoTransactions.map((item) => item.paymentStatus))).toEqual(
      new Set(["pending", "failed", "paid", "refunded"]),
    );
    expect(
      new Set(demoTransactions.map((item) => item.fulfilmentStatus)),
    ).toEqual(new Set(["pending", "shipped", "delivered"]));
  });

  it("provides demo conversations and notifications for live event testing", () => {
    const usersById = new Set(demoUsers.map((user) => user.id));
    const listingsById = new Set(demoListings.map((listing) => listing.id));
    const conversationsById = new Map(
      demoConversations.map((conversation) => [conversation.id, conversation]),
    );

    for (const conversation of demoConversations) {
      expect(listingsById.has(conversation.listingId)).toBe(true);
      expect(usersById.has(conversation.buyerId)).toBe(true);
      expect(usersById.has(conversation.sellerId)).toBe(true);
    }

    for (const message of demoMessages) {
      const conversation = conversationsById.get(message.conversationId);
      expect(conversation).toBeDefined();
      expect([conversation?.buyerId, conversation?.sellerId]).toContain(
        message.senderId,
      );
    }

    for (const notification of demoNotifications) {
      expect(usersById.has(notification.userId)).toBe(true);
    }
    expect(demoMessages.some((message) => !message.readAt)).toBe(true);
    expect(demoMessages.some((message) => Boolean(message.readAt))).toBe(true);
    expect(demoNotifications.some((notification) => !notification.readAt)).toBe(
      true,
    );
    expect(
      demoNotifications.some((notification) => Boolean(notification.readAt)),
    ).toBe(true);

    expect(
      demoListings.some(
        (listing) =>
          listing.id === "listing-omega-speedmaster-moonwatch" &&
          listing.status === "active" &&
          listing.sellerId === "demo-seller",
      ),
    ).toBe(true);
  });
});
