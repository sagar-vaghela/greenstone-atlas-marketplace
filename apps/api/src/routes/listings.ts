import type { ListingStatus, UpdateListingInput } from "@atlas/types";
import {
  createListingSchema,
  listingQuerySchema,
  updateListingStatusSchema,
  updateListingSchema,
} from "@atlas/validation";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ListingRepository } from "../repositories/listing-repository.js";
import type { OfferRepository } from "../repositories/offer-repository.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import { InvalidListingStatusTransitionError } from "../domain/listing-status.js";
import { requireAuthenticatedUser } from "../auth/middleware.js";

interface ListingRouteOptions {
  repository: ListingRepository;
  offerRepository: OfferRepository;
  eventBus: MarketplaceEventBus;
}

interface ListingIdParams {
  id: string;
}

interface ListingQuerystring {
  [key: string]: unknown;
}

interface CreateListingRequest extends FastifyRequest<{ Body: unknown }> {
  body: unknown;
}

interface UpdateListingRequest extends FastifyRequest<{
  Params: ListingIdParams;
  Body: unknown;
}> {
  body: unknown;
}

interface UpdateListingStatusRequest extends FastifyRequest<{
  Params: ListingIdParams;
  Body: unknown;
}> {
  body: unknown;
}

export const registerListingRoutes = async (
  app: FastifyInstance,
  options: ListingRouteOptions,
): Promise<void> => {
  app.get<{ Querystring: ListingQuerystring }>(
    "/listings",
    async (request, reply) => {
      const result = listingQuerySchema.safeParse(request.query);
      if (!result.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request query",
            details: result.error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
        });
      }

      return { items: await options.repository.list(result.data) };
    },
  );

  app.get<{ Params: ListingIdParams }>(
    "/listings/:id",
    async (request, reply) => {
      const listing = await options.repository.findById(request.params.id);
      if (!listing) {
        return reply.status(404).send({
          error: {
            code: "LISTING_NOT_FOUND",
            message: "Listing not found",
          },
        });
      }

      return listing;
    },
  );

  app.post("/listings", async (request: CreateListingRequest, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const result = createListingSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
      });
    }

    const listing = await options.repository.create({
      ...result.data,
      sellerId: user.id,
    });
    return reply.status(201).send(listing);
  });

  app.patch<{ Params: ListingIdParams; Body: unknown }>(
    "/listings/:id",
    async (request: UpdateListingRequest, reply) => {
      const result = updateListingSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: result.error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
        });
      }

      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const existing = await options.repository.findById(request.params.id);
      if (!existing)
        return reply
          .status(404)
          .send({
            error: { code: "LISTING_NOT_FOUND", message: "Listing not found" },
          });
      if (existing.sellerId !== user.id)
        return reply
          .status(403)
          .send({
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to perform this action.",
            },
          });

      const listing = await options.repository.update(
        request.params.id,
        result.data satisfies UpdateListingInput,
      );
      if (!listing) {
        return reply.status(404).send({
          error: {
            code: "LISTING_NOT_FOUND",
            message: "Listing not found",
          },
        });
      }

      return reply.status(200).send(listing);
    },
  );

  app.patch<{ Params: ListingIdParams; Body: unknown }>(
    "/listings/:id/status",
    async (request: UpdateListingStatusRequest, reply) => {
      const result = updateListingStatusSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: result.error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
        });
      }

      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const existing = await options.repository.findById(request.params.id);
      if (!existing)
        return reply
          .status(404)
          .send({
            error: { code: "LISTING_NOT_FOUND", message: "Listing not found" },
          });
      if (existing.sellerId !== user.id)
        return reply
          .status(403)
          .send({
            error: {
              code: "FORBIDDEN",
              message: "You don't have permission to perform this action.",
            },
          });

      let listing;
      try {
        listing = await options.repository.updateStatus(
          request.params.id,
          result.data.status satisfies ListingStatus,
        );
      } catch (error: unknown) {
        if (error instanceof InvalidListingStatusTransitionError) {
          return reply.status(409).send({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: error.message,
            },
          });
        }
        throw error;
      }

      if (!listing) {
        return reply.status(404).send({
          error: {
            code: "LISTING_NOT_FOUND",
            message: "Listing not found",
          },
        });
      }

      const offers = await options.offerRepository.listByListingId(listing.id);
      options.eventBus.publish(
        { type: "listing.status_changed", listingId: listing.id, actorUserId: user.id, payload: { listing } },
        [listing.sellerId, ...offers.map((offer) => offer.buyerId)],
      );

      return reply.status(200).send(listing);
    },
  );
};
