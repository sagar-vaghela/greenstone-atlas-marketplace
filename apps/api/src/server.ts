import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { connectMongoDB, type MongoConnection } from "./db/mongodb.js";
import { InMemoryListingRepository } from "./repositories/in-memory-listing-repository.js";
import { MongoListingRepository } from "./repositories/mongo-listing-repository.js";

let app: ReturnType<typeof buildApp> | undefined;
let mongoConnection: MongoConnection | undefined;
let shutdownPromise: Promise<void> | undefined;

const start = async (): Promise<void> => {
  try {
    const repository = config.mongodbUri
      ? (() => {
          return connectMongoDB(config.mongodbUri, config.mongodbDbName).then(
            (connection) => {
              mongoConnection = connection;
              return new MongoListingRepository(
                connection.db.collection("listings"),
              );
            },
          );
        })()
      : Promise.resolve(new InMemoryListingRepository());

    app = buildApp({ repository: await repository });
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
