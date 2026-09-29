import type { OfferStatus } from "@atlas/types";
import {
  counterOfferRequestSchema,
  createOfferRequestSchema,
  updateOfferStatusSchema,
} from "@atlas/validation";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import { InvalidOfferTransitionError } from "../domain/offer-status.js";
import type { ListingRepository } from "../repositories/listing-repository.js";
import type { OfferRepository } from "../repositories/offer-repository.js";

interface Options {
  listingRepository: ListingRepository;
  offerRepository: OfferRepository;
}
interface IdParams {
  id: string;
}
interface ListingParams {
  listingId: string;
}
const error = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.status(status).send({ error: { code, message } });

export const registerOfferRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.get<{ Params: ListingParams }>(
    "/listings/:listingId/offers",
    async (request, reply) => {
      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const listing = await options.listingRepository.findById(
        request.params.listingId,
      );
      if (!listing)
        return error(reply, 404, "LISTING_NOT_FOUND", "Listing not found");
      if (listing.sellerId !== user.id)
        return {
          items: (
            await options.offerRepository.listByListingId(listing.id)
          ).filter((offer) => offer.buyerId === user.id),
        };
      return {
        items: await options.offerRepository.listByListingId(listing.id),
      };
    },
  );
  app.get<{ Params: IdParams }>("/offers/:id", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const offer = await options.offerRepository.findById(request.params.id);
    if (offer && offer.buyerId !== user.id && offer.sellerId !== user.id)
      return error(
        reply,
        403,
        "FORBIDDEN",
        "You don't have permission to perform this action.",
      );
    return offer
      ? offer
      : error(reply, 404, "OFFER_NOT_FOUND", "Offer not found");
  });
  app.post<{ Params: ListingParams; Body: unknown }>(
    "/listings/:listingId/offers",
    async (request, reply) => {
      const parsed = createOfferRequestSchema.safeParse(request.body);
      if (!parsed.success)
        return error(reply, 400, "VALIDATION_ERROR", "Invalid offer details.");
      const listing = await options.listingRepository.findById(
        request.params.listingId,
      );
      if (!listing)
        return error(reply, 404, "LISTING_NOT_FOUND", "Listing not found");
      if (listing.status !== "active")
        return error(
          reply,
          409,
          "LISTING_NOT_ACTIVE",
          "This listing is no longer accepting offers.",
        );
      const buyer = requireAuthenticatedUser(request, reply);
      if (!buyer) return;
      if (buyer.id === listing.sellerId)
        return error(
          reply,
          403,
          "FORBIDDEN",
          "You cannot make an offer on your own listing.",
        );
      if (parsed.data.parentOfferId) {
        const parent = await options.offerRepository.findById(
          parsed.data.parentOfferId,
        );
        if (
          !parent ||
          parent.listingId !== listing.id ||
          parent.buyerId !== buyer.id ||
          parent.status !== "countered"
        )
          return error(
            reply,
            409,
            "OFFER_NOT_ACTIONABLE",
            "This counter-offer is no longer actionable.",
          );
      }
      const offer = await options.offerRepository.create({
        ...parsed.data,
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
      });
      return reply.status(201).send(offer);
    },
  );
  app.patch<{ Params: IdParams; Body: unknown }>(
    "/offers/:id/status",
    async (request, reply) => {
      const parsed = updateOfferStatusSchema.safeParse(request.body);
      if (!parsed.success)
        return error(reply, 400, "VALIDATION_ERROR", "Invalid offer action.");
      const offer = await options.offerRepository.findById(request.params.id);
      if (!offer)
        return error(reply, 404, "OFFER_NOT_FOUND", "Offer not found");
      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const isSeller = user.id === offer.sellerId;
      const isBuyer = user.id === offer.buyerId;
      if (
        (parsed.data.status === "withdrawn" && !isBuyer) ||
        ((parsed.data.status === "accepted" ||
          parsed.data.status === "rejected") &&
          !isSeller &&
          !(
            parsed.data.status === "accepted" &&
            isBuyer &&
            offer.status === "countered"
          ))
      )
        return error(
          reply,
          403,
          "FORBIDDEN",
          "You don't have permission to perform this action.",
        );
      const listing = await options.listingRepository.findById(offer.listingId);
      if (!listing)
        return error(reply, 404, "LISTING_NOT_FOUND", "Listing not found");
      if (parsed.data.status === "accepted") {
        if (listing.status !== "active")
          return error(
            reply,
            409,
            "OFFER_CONFLICT",
            "This listing has already been sold.",
          );
        const accepted = await options.offerRepository.updateStatus(
          offer.id,
          "accepted",
        );
        if (!accepted)
          return error(
            reply,
            409,
            "OFFER_CONFLICT",
            "Offer could not be accepted.",
          );
        await options.listingRepository.updateStatus(listing.id, "sold");
        const competing = await options.offerRepository.listByListingId(
          listing.id,
        );
        await Promise.all(
          competing
            .filter(
              (item) =>
                item.id !== offer.id &&
                (item.status === "pending" || item.status === "countered"),
            )
            .map((item) =>
              options.offerRepository.updateStatus(item.id, "rejected"),
            ),
        );
        return accepted;
      }
      try {
        return await options.offerRepository.updateStatus(
          offer.id,
          parsed.data.status as OfferStatus,
        );
      } catch (caught) {
        if (caught instanceof InvalidOfferTransitionError)
          return error(reply, 409, "INVALID_OFFER_TRANSITION", caught.message);
        throw caught;
      }
    },
  );
  app.post<{ Params: IdParams; Body: unknown }>(
    "/offers/:id/counter",
    async (request, reply) => {
      const parsed = counterOfferRequestSchema.safeParse(request.body);
      if (!parsed.success)
        return error(
          reply,
          400,
          "VALIDATION_ERROR",
          "Invalid counter-offer details.",
        );
      const original = await options.offerRepository.findById(
        request.params.id,
      );
      if (!original)
        return error(reply, 404, "OFFER_NOT_FOUND", "Offer not found");
      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      if (user.id !== original.sellerId)
        return error(
          reply,
          403,
          "FORBIDDEN",
          "Only the seller can counter this offer.",
        );
      const listing = await options.listingRepository.findById(
        original.listingId,
      );
      if (!listing || listing.status !== "active")
        return error(
          reply,
          409,
          "OFFER_NOT_ACTIONABLE",
          "This offer is no longer actionable.",
        );
      try {
        await options.offerRepository.updateStatus(original.id, "countered");
      } catch (caught) {
        if (caught instanceof InvalidOfferTransitionError)
          return error(reply, 409, "OFFER_NOT_ACTIONABLE", caught.message);
        throw caught;
      }
      const created = await options.offerRepository.create({
        ...parsed.data,
        listingId: original.listingId,
        buyerId: original.buyerId,
        sellerId: original.sellerId,
        parentOfferId: original.id,
      });
      await options.offerRepository.updateStatus(created.id, "countered");
      return reply
        .status(201)
        .send(await options.offerRepository.findById(created.id));
    },
  );
};
