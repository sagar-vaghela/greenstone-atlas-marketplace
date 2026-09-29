import type { CreateOfferInput, Offer, OfferStatus } from "@atlas/types";
export interface OfferRepository {
  listByListingId(listingId: string): Promise<Offer[]>;
  listByBuyerId(buyerId: string): Promise<Offer[]>;
  listBySellerId(sellerId: string): Promise<Offer[]>;
  findById(id: string): Promise<Offer | undefined>;
  create(input: CreateOfferInput): Promise<Offer>;
  updateStatus(id: string, status: OfferStatus): Promise<Offer | undefined>;
}