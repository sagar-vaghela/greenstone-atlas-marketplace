import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type { Auction, Bid, CreateAuctionInput, PlaceBidInput } from "@atlas/types";
import { assertValidAuctionTransition, assertValidBidTransition, BidConflictError } from "../domain/auction-status.js";
import type { AuctionRepository } from "./auction-repository.js";

type AuctionDocument = Auction & { _id?: ObjectId };
type BidDocument = Bid & { _id?: ObjectId };
const auction = (doc: AuctionDocument): Auction => { const { _id: _id, ...value } = doc; return value; };
const bid = (doc: BidDocument): Bid => { const { _id: _id, ...value } = doc; return value; };

export class MongoAuctionRepository implements AuctionRepository {
  constructor(private readonly auctions: Collection<AuctionDocument>, private readonly bids: Collection<BidDocument>) {}
  async create(input: CreateAuctionInput): Promise<Auction> {
    const value: Auction = { ...input, id: `auction-${randomUUID()}`, status: Date.now() < new Date(input.startsAt).getTime() ? "scheduled" : "active", version: 1 };
    await this.auctions.insertOne(value);
    return value;
  }
  async findById(id: string): Promise<Auction | undefined> { const value = await this.auctions.findOne({ id }, { projection: { _id: 0 } }); return value ? auction(value) : undefined; }
  async findByListingId(listingId: string): Promise<Auction | undefined> { const value = await this.auctions.findOne({ listingId }, { projection: { _id: 0 } }); return value ? auction(value) : undefined; }
  async updateStatus(id: string, status: Auction["status"]): Promise<Auction | undefined> {
    const current = await this.auctions.findOne({ id });
    if (!current) return undefined;
    assertValidAuctionTransition(current.status, status);
    const value = await this.auctions.findOneAndUpdate({ id, status: current.status, version: current.version }, { $set: { status }, $inc: { version: 1 } }, { returnDocument: "after", projection: { _id: 0 } });
    return value ? auction(value) : undefined;
  }
  async listExpiredActive(now: string): Promise<Auction[]> { return (await this.auctions.find({ status: "active", endsAt: { $lte: now } }, { projection: { _id: 0 } }).toArray()).map(auction); }
  async placeBid(input: PlaceBidInput): Promise<{ auction: Auction; bid: Bid }> {
    const current = await this.auctions.findOne({ id: input.auctionId, listingId: input.listingId, status: "active", endsAt: { $gt: new Date().toISOString() } });
    if (!current) throw new BidConflictError("AUCTION_CLOSED");
    const highest = current.highestBidId ? await this.bids.findOne({ id: current.highestBidId }) : undefined;
    const minimum = (highest?.amount ?? current.startingPrice) + current.minimumBidIncrement;
    if (input.amount < minimum) throw new BidConflictError("BID_TOO_LOW");
    const value: Bid = { id: `bid-${randomUUID()}`, ...input, status: "winning", createdAt: new Date().toISOString(), version: 1 };
    const updated = await this.auctions.findOneAndUpdate({ id: current.id, status: "active", version: current.version, ...(highest ? { highestBidId: highest.id } : {}) }, { $set: { highestBidId: value.id }, $inc: { version: 1 } }, { returnDocument: "after", projection: { _id: 0 } });
    if (!updated) throw new BidConflictError("BID_TOO_LOW");
    if (highest) await this.bids.updateOne({ id: highest.id, status: "winning" }, { $set: { status: "outbid" }, $inc: { version: 1 } });
    await this.bids.insertOne(value);
    return { auction: auction(updated), bid: value };
  }
  async listBids(auctionId: string): Promise<Bid[]> { return (await this.bids.find({ auctionId }, { projection: { _id: 0 } }).sort({ createdAt: -1, id: -1 }).toArray()).map(bid); }
  async updateBidStatus(id: string, status: Bid["status"]): Promise<Bid | undefined> {
    const current = await this.bids.findOne({ id });
    if (!current) return undefined;
    assertValidBidTransition(current.status, status);
    const value = await this.bids.findOneAndUpdate({ id, status: current.status, version: current.version }, { $set: { status }, $inc: { version: 1 } }, { returnDocument: "after", projection: { _id: 0 } });
    return value ? bid(value) : undefined;
  }
}
