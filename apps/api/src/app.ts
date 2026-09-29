import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config/index.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import type { ListingRepository } from "./repositories/listing-repository.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerListingRoutes } from "./routes/listings.js";

interface BuildAppOptions {
  repository?: ListingRepository;
}

export const buildApp = (options: BuildAppOptions = {}) => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  app.register(cors, {
    origin: config.corsOrigin,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "Internal server error";

    return reply.status(statusCode).send({
      error: {
        code:
          statusCode === 400
            ? "VALIDATION_ERROR"
            : statusCode === 404
              ? "NOT_FOUND"
              : "INTERNAL_SERVER_ERROR",
        message:
          statusCode === 400
            ? "Invalid request"
            : statusCode < 500
              ? message
              : "Internal server error",
      },
    });
  });

  const listingRepository =
    options.repository ?? new InMemoryListingRepository();

  app.register(registerHealthRoute);
  app.register(registerListingRoutes, { repository: listingRepository });

  return app;
};
