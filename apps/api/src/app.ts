import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
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
import type { PaymentProvider } from "./payments/payment-provider.js";
import { DemoPaymentProvider } from "./payments/payment-provider.js";
import { StripePaymentProvider } from "./payments/stripe-payment-provider.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { isOriginAllowed } from "./http/origin.js";

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
  paymentProvider?: PaymentProvider;
  readinessCheck?: () => Promise<void>;
}

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

declare module "fastify" {
  interface FastifyRequest {
    startedAt: number;
  }
}

const getRequestId = (request: {
  id: string;
  headers: Record<string, string | string[] | undefined>;
}): string => {
  const incoming = request.headers["x-request-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && requestIdPattern.test(value) ? value : request.id;
};

export const buildApp = (options: BuildAppOptions = {}) => {
  const app = Fastify({
    requestIdHeader: "x-request-id",
    genReqId: (request) =>
      getRequestId({ id: crypto.randomUUID(), headers: request.headers }),
    logger: {
      level: config.logLevel,
    },
  });

  const userRepository = options.userRepository ?? new InMemoryUserRepository();
  const sessionRepository =
    options.sessionRepository ?? new InMemorySessionRepository();
  registerAuthentication(app, userRepository, sessionRepository);

  app.register(cors, {
    origin: (origin, callback) => {
      const allowed = isOriginAllowed(origin, config);
      callback(allowed ? null : new Error("CORS origin not allowed"), allowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  });

  app.decorateRequest("startedAt", 0);
  app.addHook("onRequest", async (request, reply) => {
    request.startedAt = performance.now();
    reply.header("X-Request-Id", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    const durationMs = performance.now() - request.startedAt;
    const metadata = {
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      durationMs: Math.round(durationMs),
      ...(request.user ? { userId: request.user.id } : {}),
    };
    if (durationMs >= config.slowRequestMs) {
      request.log.warn(metadata, "Slow API request");
    } else {
      request.log.info(metadata, "API request completed");
    }
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      { err: error, requestId: request.id },
      "Unhandled API error",
    );

    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const code =
      statusCode === 400
        ? "VALIDATION_ERROR"
        : statusCode === 401
          ? "UNAUTHENTICATED"
          : statusCode === 403
            ? "FORBIDDEN"
            : statusCode === 404
              ? "NOT_FOUND"
              : statusCode === 409
                ? "CONFLICT"
                : statusCode === 422
                  ? "VALIDATION_ERROR"
                  : statusCode === 429
                    ? "RATE_LIMITED"
                    : "INTERNAL_SERVER_ERROR";
    const message =
      statusCode >= 500
        ? "Internal server error"
        : statusCode === 400 || statusCode === 422
          ? "Invalid request"
          : typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof error.message === "string"
            ? error.message
            : "Request could not be completed";

    return reply.status(statusCode).send({
      error: {
        code,
        message,
        requestId: request.id,
      },
    });
  });

  app.register(websocket);

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
  const paymentProvider =
    options.paymentProvider ??
    (config.paymentProvider === "stripe"
      ? new StripePaymentProvider(
          config.stripeSecretKey!,
          config.stripeWebhookSecret!,
        )
      : new DemoPaymentProvider());
  const notificationService = new NotificationService(
    notificationRepository,
    eventBus,
  );

  app.register(registerHealthRoute, {
    readinessCheck: options.readinessCheck,
  });
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
  app.register(registerPaymentRoutes, {
    transactionRepository,
    paymentProvider,
    eventBus,
  });
  app.register(registerConversationRoutes, {
    conversations: conversationRepository,
    listings: listingRepository,
    notifications: notificationRepository,
    users: userRepository,
    eventBus,
  });
  app.register(registerNotificationRoutes, {
    repository: notificationRepository,
  });
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
