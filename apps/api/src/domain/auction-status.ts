import type { AuctionStatus, BidStatus } from "@atlas/types";

export class InvalidAuctionTransitionError extends Error {}
export class BidConflictError extends Error {
  constructor(readonly code: "BID_TOO_LOW" | "AUCTION_CLOSED") {
    super(code === "BID_TOO_LOW" ? "Bid must exceed the current minimum." : "Auction is no longer accepting bids.");
  }
}

const auctionTransitions: Record<AuctionStatus, AuctionStatus[]> = {
  scheduled: ["active", "cancelled"],
  active: ["ended", "cancelled"],
  ended: [],
  cancelled: [],
};

const bidTransitions: Record<BidStatus, BidStatus[]> = {
  active: ["outbid", "winning", "withdrawn"],
  outbid: [],
  winning: ["accepted", "outbid"],
  withdrawn: [],
  accepted: [],
};

export const assertValidAuctionTransition = (current: AuctionStatus, next: AuctionStatus): void => {
  if (!auctionTransitions[current].includes(next)) {
    throw new InvalidAuctionTransitionError(`Auction status cannot be changed from ${current} to ${next}.`);
  }
};

export const assertValidBidTransition = (current: BidStatus, next: BidStatus): void => {
  if (!bidTransitions[current].includes(next)) {
    throw new InvalidAuctionTransitionError(`Bid status cannot be changed from ${current} to ${next}.`);
  }
};

export const auctionStatusAt = (auction: { startsAt: string; endsAt: string }, now = Date.now()): AuctionStatus =>
  now < new Date(auction.startsAt).getTime() ? "scheduled" : now >= new Date(auction.endsAt).getTime() ? "ended" : "active";
