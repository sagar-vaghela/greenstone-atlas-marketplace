import type { CreateListingInput, UpdateListingInput } from "@atlas/types";
import { createListingSchema, updateListingSchema } from "@atlas/validation";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ListingRepository } from "../repositories/listing-repository.js";

interface ListingRouteOptions {
  repository: ListingRepository;
}

interface ListingIdParams {
  id: string;
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

export const registerListingRoutes = async (
  app: FastifyInstance,
  options: ListingRouteOptions,
): Promise<void> => {
  app.get("/listings", async () => ({
    items: options.repository.list(),
  }));

  app.get<{ Params: ListingIdParams }>(
    "/listings/:id",
    async (request, reply) => {
      const listing = options.repository.findById(request.params.id);
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

    const listing = options.repository.create(
      result.data satisfies CreateListingInput,
    );
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

      const listing = options.repository.update(
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
};
