import type { Auction, Bid, CreateAuctionInput, PlaceBidInput } from "@atlas/types";

export interface AuctionRepository {
  create(input: CreateAuctionInput): Promise<Auction>;
  findById(id: string): Promise<Auction | undefined>;
  findByListingId(listingId: string): Promise<Auction | undefined>;
  updateStatus(id: string, status: Auction["status"]): Promise<Auction | undefined>;
  listExpiredActive(now: string): Promise<Auction[]>;
  placeBid(input: PlaceBidInput): Promise<{ auction: Auction; bid: Bid }>;
  listBids(auctionId: string): Promise<Bid[]>;
  updateBidStatus(id: string, status: Bid["status"]): Promise<Bid | undefined>;
}
