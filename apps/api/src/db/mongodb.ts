import { MongoClient, type Db } from "mongodb";

export interface MongoConnection {
  db: Db;
  close: () => Promise<void>;
}

export const connectMongoDB = async (
  uri: string,
  databaseName: string,
  options: { allowEmptyDatabase?: boolean } = {},
): Promise<MongoConnection> => {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 20_000,
    retryWrites: true,
    maxPoolSize: 25,
    minPoolSize: 1,
  });

  try {
    await client.connect();
    await client.db(databaseName).command({ ping: 1 });
    const db = client.db(databaseName);
    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();
    if (existingCollections.length === 0 && !options.allowEmptyDatabase) {
      throw new Error(
        `MongoDB database "${databaseName}" must be created in Atlas before API startup.`,
      );
    }

    const listings = db.collection("listings");
    const offers = db.collection("offers");
    const users = db.collection("users");
    const sessions = db.collection("sessions");
    const transactions = db.collection("transactions");
    const conversations = db.collection("conversations");
    const messages = db.collection("messages");
    const notifications = db.collection("notifications");
    const auctions = db.collection("auctions");
    const bids = db.collection("bids");

    await listings.createIndex({ id: 1 }, { unique: true });
    await listings.createIndex({ status: 1, updatedAt: -1 });
    await listings.createIndex({ sellerId: 1, status: 1, createdAt: -1 });
    await listings.createIndex({ category: 1, status: 1, price: 1 });
    await listings.createIndex({ brand: 1, model: 1, status: 1 });
    await listings.createIndex({ location: 1, status: 1, createdAt: -1 });
    await listings.createIndex({ price: 1, status: 1 });
    await listings.createIndex({ createdAt: -1 });
    await listings.createIndex({ updatedAt: -1 });
    await listings.createIndex({ title: "text", description: "text" });

    await offers.createIndex({ id: 1 }, { unique: true });
    await offers.createIndex({ listingId: 1, createdAt: -1 });
    await offers.createIndex({ buyerId: 1, createdAt: -1 });
    await offers.createIndex({ sellerId: 1, status: 1, createdAt: -1 });
    await offers.createIndex({ sellerId: 1, listingId: 1, status: 1 });

    await transactions.createIndex({ id: 1 }, { unique: true });
    await transactions.createIndex({ listingId: 1 }, { unique: true });
    await transactions.createIndex({ offerId: 1 }, { unique: true });
    await transactions.createIndex({ buyerId: 1, status: 1, createdAt: -1 });
    await transactions.createIndex({ sellerId: 1, status: 1, createdAt: -1 });
    await transactions.createIndex({
      status: 1,
      paymentStatus: 1,
      fulfilmentStatus: 1,
    });

    await users.createIndex({ id: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ role: 1, createdAt: -1 });

    await sessions.createIndex({ id: 1 }, { unique: true });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await sessions.createIndex({ userId: 1, createdAt: -1 });

    await conversations.createIndex({ id: 1 }, { unique: true });
    await conversations.createIndex({ buyerId: 1, updatedAt: -1 });
    await conversations.createIndex({ sellerId: 1, updatedAt: -1 });
    await conversations.createIndex({ listingId: 1, updatedAt: -1 });
    await conversations.createIndex(
      { buyerId: 1, sellerId: 1, listingId: 1 },
      { unique: true },
    );
    await conversations.createIndex({ updatedAt: -1 });

    await messages.createIndex({ id: 1 }, { unique: true });
    await messages.createIndex({ conversationId: 1, createdAt: -1 });
    await messages.createIndex({ conversationId: 1, senderId: 1, readAt: 1 });
    await messages.createIndex({ senderId: 1, createdAt: -1 });

    await notifications.createIndex({ id: 1 }, { unique: true });
    await notifications.createIndex({ userId: 1, createdAt: -1, id: -1 });
    await notifications.createIndex({ userId: 1, readAt: 1, createdAt: -1 });
    await notifications.createIndex(
      { userId: 1, sourceEventId: 1 },
      { unique: true },
    );
    await auctions.createIndex({ id: 1 }, { unique: true });
    await auctions.createIndex({ listingId: 1 }, { unique: true });
    await auctions.createIndex({ status: 1, endsAt: 1 });
    await auctions.createIndex({ highestBidId: 1 });
    await bids.createIndex({ id: 1 }, { unique: true });
    await bids.createIndex({ auctionId: 1, amount: -1 });
    await bids.createIndex({ auctionId: 1, createdAt: -1 });
    await bids.createIndex({ bidderId: 1, createdAt: -1 });
    await notifications.createIndex(
      { userId: 1, dedupeKey: 1 },
      {
        unique: true,
        partialFilterExpression: { dedupeKey: { $exists: true } },
      },
    );

    return {
      db,
      close: async () => {
        try {
          await client.close();
        } catch {
          // The client may already be disconnected during shutdown.
        }
      },
    };
  } catch (error) {
    await client.close();
    const message =
      error instanceof Error && error.message
        ? error.message
        : "MongoDB connection failed. Connection details are redacted.";
    console.error(
      "MongoDB connection failed: connection details are redacted.",
    );
    console.error(message);
    throw new Error("Unable to connect to MongoDB", { cause: error });
  }
};
