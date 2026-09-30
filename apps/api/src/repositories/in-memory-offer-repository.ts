import { randomUUID } from "node:crypto";
import type { CreateOfferInput, Offer, OfferStatus } from "@atlas/types";
import { assertValidOfferTransition } from "../domain/offer-status.js";
import type { OfferRepository } from "./offer-repository.js";

export class InMemoryOfferRepository implements OfferRepository {
  private readonly offers: Offer[] = [
    this.seed("offer-1", "listing-1", "demo-buyer", 24000, "pending"),
    this.seed(
      "offer-2",
      "listing-1",
      "demo-buyer",
      26000,
      "countered",
      "offer-1",
    ),
    this.seed("offer-3", "listing-1", "demo-buyer-2", 25000, "pending"),
  ];
  async listByListingId(listingId: string): Promise<Offer[]> {
    return this.offers
      .filter((offer) => offer.listingId === listingId)
      .map(copy);
  }
  async listByBuyerId(buyerId: string): Promise<Offer[]> {
    return this.offers.filter((offer) => offer.buyerId === buyerId).map(copy);
  }
  async listBySellerId(sellerId: string): Promise<Offer[]> {
    return this.offers.filter((offer) => offer.sellerId === sellerId).map(copy);
  }
  async findById(id: string): Promise<Offer | undefined> {
    const offer = this.offers.find((item) => item.id === id);
    return offer ? copy(offer) : undefined;
  }
  async create(input: CreateOfferInput): Promise<Offer> {
    const timestamp = new Date().toISOString();
    const offer: Offer = {
      ...input,
      id: `offer-${randomUUID()}`,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    this.offers.push(offer);
    return copy(offer);
  }
  async updateStatus(
    id: string,
    status: OfferStatus,
  ): Promise<Offer | undefined> {
    const offer = this.offers.find((item) => item.id === id);
    if (!offer) return undefined;
    assertValidOfferTransition(offer.status, status);
    offer.status = status;
    offer.updatedAt = new Date().toISOString();
    offer.version += 1;
    return copy(offer);
  }
  private seed(
    id: string,
    listingId: string,
    buyerId: string,
    amount: number,
    status: OfferStatus,
    parentOfferId?: string,
  ): Offer {
    const timestamp = new Date().toISOString();
    return {
      id,
      listingId,
      buyerId,
      sellerId: "demo-seller",
      amount,
      currency: "AED",
      status,
      parentOfferId,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
  }
}
const copy = (offer: Offer): Offer => ({ ...offer });
