import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config/index.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import type { ListingRepository } from "./repositories/listing-repository.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerListingRoutes } from "./routes/listings.js";
import { InMemoryOfferRepository } from "./repositories/in-memory-offer-repository.js";
import type { OfferRepository } from "./repositories/offer-repository.js";
import { registerOfferRoutes } from "./routes/offers.js";
import { InMemoryUserRepository } from "./repositories/in-memory-user-repository.js";
import { InMemorySessionRepository } from "./repositories/in-memory-session-repository.js";
import type { UserRepository } from "./repositories/user-repository.js";
import type { SessionRepository } from "./repositories/session-repository.js";
import { registerAuthentication } from "./auth/middleware.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { InMemorySellerProfileRepository } from "./repositories/in-memory-seller-profile-repository.js";
import type { SellerProfileRepository } from "./repositories/seller-profile-repository.js";
import { registerSellerRoutes } from "./routes/sellers.js";
import { MarketplaceEventBus } from "./events/marketplace-event-bus.js";
import { registerEventRoutes } from "./routes/events.js";
import { InMemoryTransactionRepository } from "./repositories/in-memory-transaction-repository.js";
import type { TransactionRepository } from "./repositories/transaction-repository.js";
import { registerTransactionRoutes } from "./routes/transactions.js";
import { InMemoryConversationRepository } from "./repositories/in-memory-conversation-repository.js";
import type { ConversationRepository } from "./repositories/conversation-repository.js";
import { registerConversationRoutes } from "./routes/conversations.js";
import { InMemoryNotificationRepository } from "./repositories/in-memory-notification-repository.js";
import type { NotificationRepository } from "./repositories/notification-repository.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { NotificationService } from "./events/notification-service.js";

interface BuildAppOptions {
  repository?: ListingRepository;
  offerRepository?: OfferRepository;
  userRepository?: UserRepository;
  sessionRepository?: SessionRepository;
  secureCookies?: boolean;
  sessionTtlMs?: number;
  sellerProfileRepository?: SellerProfileRepository;
  transactionRepository?: TransactionRepository;
  eventBus?: MarketplaceEventBus;
  conversationRepository?: ConversationRepository;
  notificationRepository?: NotificationRepository;
}

export const buildApp = (options: BuildAppOptions = {}) => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  const userRepository = options.userRepository ?? new InMemoryUserRepository();
  const sessionRepository =
    options.sessionRepository ?? new InMemorySessionRepository();
  registerAuthentication(app, userRepository, sessionRepository);

  app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
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
  const eventBus = options.eventBus ?? new MarketplaceEventBus();
  const offerRepository =
    options.offerRepository ?? new InMemoryOfferRepository();
  const transactionRepository =
    options.transactionRepository ?? new InMemoryTransactionRepository();
  const conversationRepository =
    options.conversationRepository ?? new InMemoryConversationRepository();
  const notificationRepository =
    options.notificationRepository ?? new InMemoryNotificationRepository();
  const notificationService = new NotificationService(notificationRepository, eventBus);

  app.register(registerHealthRoute);
  app.register(registerAuthRoutes, {
    users: userRepository,
    sessions: sessionRepository,
    secureCookies:
      options.secureCookies ?? process.env.NODE_ENV === "production",
    sessionTtlMs: options.sessionTtlMs ?? 7 * 24 * 60 * 60 * 1000,
  });
  app.register(registerListingRoutes, {
    repository: listingRepository,
    offerRepository,
    eventBus,
  });
  app.register(registerOfferRoutes, {
    listingRepository,
    offerRepository,
    eventBus,
    transactionRepository,
  });
  app.register(registerTransactionRoutes, {
    transactionRepository,
    eventBus,
  });
  app.register(registerConversationRoutes, {
    conversations: conversationRepository,
    listings: listingRepository,
    users: userRepository,
    eventBus,
  });
  app.register(registerNotificationRoutes, { repository: notificationRepository });
  app.register(registerSellerRoutes, {
    users: userRepository,
    listings: listingRepository,
    profiles:
      options.sellerProfileRepository ?? new InMemorySellerProfileRepository(),
  });
  app.register(registerEventRoutes, eventBus);
  app.addHook("onClose", async () => {
    notificationService.close();
    eventBus.close();
  });

  return app;
};
