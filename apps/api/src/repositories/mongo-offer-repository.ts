import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type { CreateOfferInput, Offer, OfferStatus } from "@atlas/types";
import { assertValidOfferTransition } from "../domain/offer-status.js";
import type { OfferRepository } from "./offer-repository.js";

interface OfferDocument extends Offer { _id?: ObjectId; }
const toOffer = (document: OfferDocument): Offer => {
  const { _id: _ignoredId, ...offer } = document;
  return { ...offer };
};

export class MongoOfferRepository implements OfferRepository {
  constructor(private readonly collection: Collection<OfferDocument>) {}
  async listByListingId(listingId: string): Promise<Offer[]> { return this.list({ listingId }); }
  async listByBuyerId(buyerId: string): Promise<Offer[]> { return this.list({ buyerId }); }
  async listBySellerId(sellerId: string): Promise<Offer[]> { return this.list({ sellerId }); }
  async findById(id: string): Promise<Offer | undefined> {
    const document = await this.collection.findOne({ id }, { projection: { _id: 0 } });
    return document ? toOffer(document) : undefined;
  }
  async create(input: CreateOfferInput): Promise<Offer> {
    const timestamp = new Date().toISOString();
    const offer: OfferDocument = { ...input, id: `offer-${randomUUID()}`, status: "pending", createdAt: timestamp, updatedAt: timestamp };
    await this.collection.insertOne(offer);
    return toOffer(offer);
  }
  async updateStatus(id: string, status: OfferStatus): Promise<Offer | undefined> {
    const current = await this.collection.findOne({ id });
    if (!current) return undefined;
    assertValidOfferTransition(current.status, status);
    const document = await this.collection.findOneAndUpdate(
      { id, status: current.status }, { $set: { status, updatedAt: new Date().toISOString() } },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return document ? toOffer(document) : undefined;
  }
  private async list(filter: Record<string, string>): Promise<Offer[]> {
    const documents = await this.collection.find(filter, { projection: { _id: 0 } }).sort({ createdAt: 1, id: 1 }).toArray();
    return documents.map(toOffer);
  }
}