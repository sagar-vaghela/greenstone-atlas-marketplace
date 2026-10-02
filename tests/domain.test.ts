import { describe, expect, it } from "vitest";
import {
  createListingSchema,
  createMessageSchema,
  createOfferRequestSchema,
  listingImageSchema,
  listingQuerySchema,
  transactionSchema,
  updateListingSchema,
} from "@atlas/validation";
import { assertValidListingStatusTransition } from "../apps/api/src/domain/listing-status.js";
import { assertValidOfferTransition } from "../apps/api/src/domain/offer-status.js";
import { assertValidAuctionTransition, assertValidBidTransition } from "../apps/api/src/domain/auction-status.js";
import { createAuctionRequestSchema, placeBidRequestSchema } from "@atlas/validation";
import {
  assertValidFulfilmentTransition,
  assertValidPaymentTransition,
  assertValidTransactionTransition,
} from "../apps/api/src/domain/transaction-status.js";

const listing = {
  title: "Watch",
  description: "A fine watch",
  price: 100,
  currency: "AED",
  category: "watches",
  images: [],
};

describe("shared validation", () => {
  it("accepts valid listings and updates but rejects empty updates", () => {
    expect(createListingSchema.safeParse(listing).success).toBe(true);
    expect(updateListingSchema.safeParse({ price: 120 }).success).toBe(true);
    expect(updateListingSchema.safeParse({}).success).toBe(false);
  });

  it("enforces image URL protocols and the eight-image limit", () => {
    expect(
      listingImageSchema.safeParse({ url: "https://example.com/watch.jpg" })
        .success,
    ).toBe(true);
    expect(
      listingImageSchema.safeParse({ url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...listing,
        images: Array.from({ length: 9 }, () => ({
          url: "https://example.com/a.jpg",
        })),
      }).success,
    ).toBe(false);
  });

  it("validates offers, filters, transactions, and messages", () => {
    expect(
      createOfferRequestSchema.safeParse({ amount: 100.25, currency: "aed" })
        .data?.currency,
    ).toBe("AED");
    expect(
      createOfferRequestSchema.safeParse({ amount: 0, currency: "AED" })
        .success,
    ).toBe(false);
    expect(
      listingQuerySchema.safeParse({ minPrice: "200", maxPrice: "100" })
        .success,
    ).toBe(false);
    expect(createMessageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(
      createMessageSchema.safeParse({ body: "x".repeat(2001) }).success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({
        id: "t",
        listingId: "l",
        offerId: "o",
        buyerId: "b",
        sellerId: "s",
        amount: 100,
        currency: "AED",
        status: "pending_payment",
        paymentStatus: "pending",
        fulfilmentStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }).success,
    ).toBe(true);
  });
});

describe("state machines", () => {
  it("allows listing and offer transitions and rejects terminal changes", () => {
    expect(() =>
      assertValidListingStatusTransition("draft", "active"),
    ).not.toThrow();
    expect(() =>
      assertValidListingStatusTransition("active", "draft"),
    ).toThrow();
    expect(() =>
      assertValidOfferTransition("pending", "countered"),
    ).not.toThrow();
    expect(() => assertValidOfferTransition("accepted", "rejected")).toThrow();
  });

  it("protects payment, fulfilment, and transaction ordering", () => {
    expect(() =>
      assertValidPaymentTransition("failed", "pending"),
    ).not.toThrow();
    expect(() => assertValidPaymentTransition("pending", "refunded")).toThrow();
    expect(() =>
      assertValidFulfilmentTransition("pending", "shipped"),
    ).not.toThrow();
    expect(() =>
      assertValidFulfilmentTransition("pending", "delivered"),
    ).toThrow();
    expect(() =>
      assertValidTransactionTransition("pending_payment", "paid"),
    ).not.toThrow();
    expect(() =>
      assertValidTransactionTransition("paid", "completed"),
    ).not.toThrow();
    expect(() =>
      assertValidTransactionTransition("pending_payment", "completed"),
    ).toThrow();
  });

  it("validates auction inputs and transitions", () => {
    const startsAt = new Date(Date.now() - 1000).toISOString();
    const endsAt = new Date(Date.now() + 60_000).toISOString();
    expect(createAuctionRequestSchema.safeParse({
      startsAt, endsAt, startingPrice: 100, minimumBidIncrement: 10,
    }).success).toBe(true);
    expect(placeBidRequestSchema.safeParse({ amount: 109, currency: "AED" }).success).toBe(true);
    expect(() => assertValidAuctionTransition("active", "ended")).not.toThrow();
    expect(() => assertValidAuctionTransition("ended", "active")).toThrow();
    expect(() => assertValidBidTransition("winning", "accepted")).not.toThrow();
    expect(() => assertValidBidTransition("outbid", "accepted")).toThrow();
  });
});
