import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { connectMongoDB, type MongoConnection } from "./db/mongodb.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import { MongoListingRepository } from "./repositories/mongo-listing-repository.js";
import { MongoOfferRepository } from "./repositories/mongo-offer-repository.js";
import { MongoUserRepository } from "./repositories/mongo-user-repository.js";
import { MongoSessionRepository } from "./repositories/mongo-session-repository.js";
import { hashPassword } from "./auth/password.js";

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
              return {
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
              };
            },
          );
        })()
      : Promise.resolve({
          listingRepository: new InMemoryListingRepository(),
          offerRepository: undefined,
          userRepository: undefined,
          sessionRepository: undefined,
        });

    app = buildApp(
      await repositories.then(
        ({
          listingRepository,
          offerRepository,
          userRepository,
          sessionRepository,
        }) => ({
          repository: listingRepository,
          offerRepository,
          userRepository,
          sessionRepository,
          secureCookies: config.secureCookies,
          sessionTtlMs: config.sessionTtlMs,
        }),
      ),
    );
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
