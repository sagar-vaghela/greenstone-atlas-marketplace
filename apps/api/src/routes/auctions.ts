import type { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import { BidConflictError, InvalidAuctionTransitionError, auctionStatusAt } from "../domain/auction-status.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import type { AuctionRepository } from "../repositories/auction-repository.js";
import type { ListingRepository } from "../repositories/listing-repository.js";
import { createAuctionRequestSchema, placeBidRequestSchema } from "@atlas/validation";

interface Options { auctions: AuctionRepository; listings: ListingRepository; eventBus: MarketplaceEventBus }
interface ListingParams { listingId: string }
interface AuctionParams { auctionId: string }
const sendError = (reply: { status: (code: number) => { send: (body: unknown) => unknown } }, status: number, code: string, message: string) =>
  reply.status(status).send({ error: { code, message } });

export const registerAuctionRoutes = async (app: FastifyInstance, options: Options): Promise<void> => {
  app.post<{ Params: ListingParams; Body: unknown }>("/listings/:listingId/auction", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const listing = await options.listings.findById(request.params.listingId);
    if (!listing) return sendError(reply, 404, "LISTING_NOT_FOUND", "Listing not found.");
    if (listing.sellerId !== user.id) return sendError(reply, 403, "FORBIDDEN", "Only the seller can create an auction.");
    if (listing.saleMode !== "auction") return sendError(reply, 409, "WRONG_SALE_MODE", "This listing is not configured for auction.");
    if (await options.auctions.findByListingId(listing.id)) return sendError(reply, 409, "AUCTION_EXISTS", "This listing already has an auction.");
    const parsed = createAuctionRequestSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, "VALIDATION_ERROR", "Invalid auction details.");
    const auction = await options.auctions.create({ ...parsed.data, listingId: listing.id, sellerId: user.id });
    options.eventBus.publish({ type: "auction.created", listingId: listing.id, actorUserId: user.id, payload: { auction } }, [user.id]);
    return reply.status(201).send(auction);
  });

  app.get<{ Params: ListingParams }>("/listings/:listingId/auction", async (request, reply) => {
    const auction = await options.auctions.findByListingId(request.params.listingId);
    return auction ?? sendError(reply, 404, "AUCTION_NOT_FOUND", "Auction not found.");
  });

  app.post<{ Params: AuctionParams; Body: unknown }>("/auctions/:auctionId/bids", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const auction = await options.auctions.findById(request.params.auctionId);
    if (!auction) return sendError(reply, 404, "AUCTION_NOT_FOUND", "Auction not found.");
    if (auction.sellerId === user.id) return sendError(reply, 403, "FORBIDDEN", "You cannot bid on your own auction.");
    if (auction.status === "scheduled" && auctionStatusAt(auction) === "active") await options.auctions.updateStatus(auction.id, "active");
    const parsed = placeBidRequestSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, "VALIDATION_ERROR", "Invalid bid details.");
    try {
      const result = await options.auctions.placeBid({ ...parsed.data, auctionId: auction.id, listingId: auction.listingId, bidderId: user.id });
      options.eventBus.publish({ type: "bid.placed", listingId: auction.listingId, actorUserId: user.id, payload: { bid: result.bid } }, [user.id, auction.sellerId]);
      return reply.status(201).send(result.bid);
    } catch (error) {
      if (error instanceof BidConflictError) return sendError(reply, 409, error.code, error.message);
      throw error;
    }
  });

  app.get<{ Params: AuctionParams }>("/auctions/:auctionId/bids", async (request, reply) => {
    const auction = await options.auctions.findById(request.params.auctionId);
    if (!auction) return sendError(reply, 404, "AUCTION_NOT_FOUND", "Auction not found.");
    return { items: await options.auctions.listBids(auction.id) };
  });

  app.post<{ Params: AuctionParams }>("/auctions/:auctionId/end", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const auction = await options.auctions.findById(request.params.auctionId);
    if (!auction) return sendError(reply, 404, "AUCTION_NOT_FOUND", "Auction not found.");
    if (auction.sellerId !== user.id) return sendError(reply, 403, "FORBIDDEN", "Only the seller can end this auction.");
    try {
      const ended = await options.auctions.updateStatus(auction.id, "ended");
      return ended;
    } catch (error) {
      if (error instanceof InvalidAuctionTransitionError) return sendError(reply, 409, "INVALID_STATUS_TRANSITION", error.message);
      throw error;
    }
  });

  app.post<{ Params: AuctionParams }>("/auctions/:auctionId/accept-winning-bid", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const auction = await options.auctions.findById(request.params.auctionId);
    if (!auction) return sendError(reply, 404, "AUCTION_NOT_FOUND", "Auction not found.");
    if (auction.sellerId !== user.id) return sendError(reply, 403, "FORBIDDEN", "Only the seller can accept a winning bid.");
    if (auction.status !== "ended") return sendError(reply, 409, "AUCTION_NOT_ENDED", "End the auction before accepting a winner.");
    if (!auction.highestBidId) return sendError(reply, 409, "NO_WINNING_BID", "This auction has no winning bid.");
    const bids = await options.auctions.listBids(auction.id);
    const winner = bids.find((bid) => bid.id === auction.highestBidId);
    if (!winner) return sendError(reply, 409, "NO_WINNING_BID", "This auction has no winning bid.");
    if (auction.reservePrice !== undefined && winner.amount < auction.reservePrice) return sendError(reply, 409, "RESERVE_NOT_MET", "The reserve price was not met.");
    const accepted = await options.auctions.updateBidStatus(winner.id, "accepted");
    if (!accepted) return sendError(reply, 409, "BID_CONFLICT", "The winning bid changed.");
    await options.listings.updateStatus(auction.listingId, "sold");
    options.eventBus.publish({ type: "auction.updated", listingId: auction.listingId, actorUserId: user.id, payload: { auction } }, [user.id, winner.bidderId]);
    return accepted;
  });
};
