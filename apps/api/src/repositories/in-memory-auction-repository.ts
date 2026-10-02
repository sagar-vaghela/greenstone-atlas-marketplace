import { randomUUID } from "node:crypto";
import type { Auction, Bid, CreateAuctionInput, PlaceBidInput } from "@atlas/types";
import { assertValidAuctionTransition, assertValidBidTransition, BidConflictError } from "../domain/auction-status.js";
import type { AuctionRepository } from "./auction-repository.js";

export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly auctions: Auction[] = [];
  private readonly bids: Bid[] = [];

  async create(input: CreateAuctionInput): Promise<Auction> {
    const auction: Auction = { ...input, id: `auction-${randomUUID()}`, status: Date.now() < new Date(input.startsAt).getTime() ? "scheduled" : "active", version: 1 };
    this.auctions.push(auction);
    return { ...auction };
  }
  async findById(id: string): Promise<Auction | undefined> {
    const auction = this.auctions.find((item) => item.id === id);
    return auction && { ...auction };
  }
  async findByListingId(listingId: string): Promise<Auction | undefined> {
    const auction = this.auctions.find((item) => item.listingId === listingId);
    return auction && { ...auction };
  }
  async updateStatus(id: string, status: Auction["status"]): Promise<Auction | undefined> {
    const auction = this.auctions.find((item) => item.id === id);
    if (!auction) return undefined;
    assertValidAuctionTransition(auction.status, status);
    auction.status = status;
    auction.version += 1;
    return { ...auction };
  }
  async listExpiredActive(now: string): Promise<Auction[]> {
    return this.auctions.filter((auction) => auction.status === "active" && auction.endsAt <= now).map((auction) => ({ ...auction }));
  }
  async placeBid(input: PlaceBidInput): Promise<{ auction: Auction; bid: Bid }> {
    const auction = this.auctions.find((item) => item.id === input.auctionId);
    if (!auction || auction.listingId !== input.listingId || auction.status !== "active" || auction.endsAt <= new Date().toISOString()) {
      throw new BidConflictError("AUCTION_CLOSED");
    }
    const highest = auction.highestBidId ? this.bids.find((bid) => bid.id === auction.highestBidId) : undefined;
    const minimum = (highest?.amount ?? auction.startingPrice) + auction.minimumBidIncrement;
    if (input.amount < minimum) throw new BidConflictError("BID_TOO_LOW");
    if (highest) {
      assertValidBidTransition(highest.status, "outbid");
      highest.status = "outbid";
      highest.version += 1;
    }
    const bid: Bid = { id: `bid-${randomUUID()}`, ...input, status: "winning", createdAt: new Date().toISOString(), version: 1 };
    this.bids.push(bid);
    auction.highestBidId = bid.id;
    auction.version += 1;
    return { auction: { ...auction }, bid: { ...bid } };
  }
  async listBids(auctionId: string): Promise<Bid[]> {
    return this.bids.filter((bid) => bid.auctionId === auctionId).map((bid) => ({ ...bid })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async updateBidStatus(id: string, status: Bid["status"]): Promise<Bid | undefined> {
    const bid = this.bids.find((item) => item.id === id);
    if (!bid) return undefined;
    assertValidBidTransition(bid.status, status);
    bid.status = status;
    bid.version += 1;
    return { ...bid };
  }
}
