import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { connectMongoDB, type MongoConnection } from "./db/mongodb.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import { MongoListingRepository } from "./repositories/mongo-listing-repository.js";
import { MongoOfferRepository } from "./repositories/mongo-offer-repository.js";

let app: ReturnType<typeof buildApp> | undefined;
let mongoConnection: MongoConnection | undefined;
let shutdownPromise: Promise<void> | undefined;

const start = async (): Promise<void> => {
  try {
    const repositories = config.mongodbUri
      ? (() => {
          return connectMongoDB(config.mongodbUri, config.mongodbDbName).then(
            (connection) => {
              mongoConnection = connection;
              return {
                listingRepository: new MongoListingRepository(connection.db.collection("listings")),
                offerRepository: new MongoOfferRepository(connection.db.collection("offers")),
              };
            },
          );
        })()
      : Promise.resolve({ listingRepository: new InMemoryListingRepository(), offerRepository: undefined });

    app = buildApp(await repositories.then(({ listingRepository, offerRepository }) => ({ repository: listingRepository, offerRepository })));
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
