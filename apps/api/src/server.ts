import "dotenv/config";
import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { connectMongoDB, type MongoConnection } from "./db/mongodb.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import { MongoListingRepository } from "./repositories/mongo-listing-repository.js";
import { MongoOfferRepository } from "./repositories/mongo-offer-repository.js";
import { MongoUserRepository } from "./repositories/mongo-user-repository.js";
import { MongoSessionRepository } from "./repositories/mongo-session-repository.js";
import { hashPassword } from "./auth/password.js";
import { InMemorySellerProfileRepository } from "./repositories/in-memory-seller-profile-repository.js";
import { MongoSellerProfileRepository } from "./repositories/mongo-seller-profile-repository.js";
import { InMemoryTransactionRepository } from "./repositories/in-memory-transaction-repository.js";
import { MongoTransactionRepository } from "./repositories/mongo-transaction-repository.js";
import { MongoConversationRepository } from "./repositories/mongo-conversation-repository.js";
import { InMemoryConversationRepository } from "./repositories/in-memory-conversation-repository.js";
import { MongoNotificationRepository } from "./repositories/mongo-notification-repository.js";

let app: ReturnType<typeof buildApp> | undefined;
let mongoConnection: MongoConnection | undefined;
let shutdownPromise: Promise<void> | undefined;

const start = async (): Promise<void> => {
  try {
    const repositories = config.mongodbUri
      ? (() => {
          return connectMongoDB(config.mongodbUri, config.mongodbDbName).then(
            async (connection) => {
              mongoConnection = connection;
              const userRepository = new MongoUserRepository(
                connection.db.collection("users"),
              );
              for (const seed of [
                {
                  id: "demo-seller",
                  email: "seller@example.com",
                  displayName: "Seller",
                  password: "seller123",
                  role: "seller" as const,
                },
                {
                  id: "demo-seller-2",
                  email: "seller2@example.com",
                  displayName: "Daniel Shah",
                  password: "seller123",
                  role: "seller" as const,
                },
                {
                  id: "demo-buyer",
                  email: "buyer@example.com",
                  displayName: "Buyer A",
                  password: "buyer123",
                  role: "buyer" as const,
                },
                {
                  id: "demo-buyer-2",
                  email: "buyer2@example.com",
                  displayName: "Buyer B",
                  password: "buyer123",
                  role: "buyer" as const,
                },
              ]) {
                if (!(await userRepository.findByEmail(seed.email)))
                  await userRepository.create({
                    ...seed,
                    passwordHash: hashPassword(seed.password),
                  });
              }
              const sellerProfileRepository = new MongoSellerProfileRepository(
                connection.db.collection("sellerProfiles"),
              );
              for (const profile of [
                {
                  userId: "demo-seller",
                  memberSince: "2025-01-01T00:00:00.000Z",
                  verificationStatus: "verified" as const,
                  responseRate: 92,
                },
                {
                  userId: "demo-seller-2",
                  memberSince: "2026-01-15T00:00:00.000Z",
                  verificationStatus: "pending" as const,
                  responseRate: 78,
                },
              ]) {
                if (
                  !(await sellerProfileRepository.findByUserId(profile.userId))
                ) {
                  await sellerProfileRepository.create(profile);
                }
              }
              return {
                readinessCheck: async () => {
                  await connection.db.command({ ping: 1 });
                },
                listingRepository: new MongoListingRepository(
                  connection.db.collection("listings"),
                ),
                offerRepository: new MongoOfferRepository(
                  connection.db.collection("offers"),
                ),
                userRepository,
                sessionRepository: new MongoSessionRepository(
                  connection.db.collection("sessions"),
                ),
                sellerProfileRepository,
                transactionRepository: new MongoTransactionRepository(
                  connection.db.collection("transactions"),
                ),
                conversationRepository: new MongoConversationRepository(
                  connection.db.collection("conversations"),
                  connection.db.collection("messages"),
                ),
                notificationRepository: new MongoNotificationRepository(
                  connection.db.collection("notifications"),
                ),
              };
            },
          );
        })()
      : Promise.resolve({
          listingRepository: new InMemoryListingRepository(),
          offerRepository: undefined,
          userRepository: undefined,
          sessionRepository: undefined,
          sellerProfileRepository: new InMemorySellerProfileRepository(),
          transactionRepository: new InMemoryTransactionRepository(),
          conversationRepository: new InMemoryConversationRepository(),
          notificationRepository: undefined,
          readinessCheck: undefined,
        });

    const resolvedRepositories = await repositories;
    app = buildApp({
      repository: resolvedRepositories.listingRepository,
      offerRepository: resolvedRepositories.offerRepository,
      userRepository: resolvedRepositories.userRepository,
      sessionRepository: resolvedRepositories.sessionRepository,
      secureCookies: config.secureCookies,
      sessionTtlMs: config.sessionTtlMs,
      sellerProfileRepository: resolvedRepositories.sellerProfileRepository,
      transactionRepository: resolvedRepositories.transactionRepository,
      conversationRepository: resolvedRepositories.conversationRepository,
      notificationRepository: resolvedRepositories.notificationRepository,
      readinessCheck: resolvedRepositories.readinessCheck,
    });
    await resolvedRepositories.sellerProfileRepository.ensureIndexes();
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app?.log.error(error);
    if (!app) {
      console.error(error);
    }
    await mongoConnection?.close();
    process.exitCode = 1;
  }
};

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    app?.log.info({ signal }, "Shutting down API server");
    await app?.close();
    await mongoConnection?.close();
  })();

  return shutdownPromise;
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
