import { MongoClient, type Db } from "mongodb";

export interface MongoConnection {
  db: Db;
  close: () => Promise<void>;
}

export const connectMongoDB = async (
  uri: string,
  databaseName: string,
): Promise<MongoConnection> => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(databaseName);
    const listings = db.collection("listings");
    const offers = db.collection("offers");
    const users = db.collection("users");
    const sessions = db.collection("sessions");
    const transactions = db.collection("transactions");
    const conversations = db.collection("conversations");
    const messages = db.collection("messages");
    const notifications = db.collection("notifications");
    await listings.createIndex({ id: 1 }, { unique: true });
    await listings.createIndex({ category: 1 });
    await listings.createIndex({ price: 1 });
    await listings.createIndex({ updatedAt: -1 });
    await offers.createIndex({ id: 1 }, { unique: true });
    await offers.createIndex({ listingId: 1, createdAt: 1 });
    await offers.createIndex({ buyerId: 1 });
    await offers.createIndex({ sellerId: 1, status: 1 });
    await transactions.createIndex({ id: 1 }, { unique: true });
    await transactions.createIndex({ listingId: 1 }, { unique: true });
    await transactions.createIndex({ offerId: 1 }, { unique: true });
    await transactions.createIndex({ buyerId: 1, status: 1 });
    await transactions.createIndex({ sellerId: 1, status: 1 });
    await users.createIndex({ id: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });
    await sessions.createIndex({ id: 1 }, { unique: true });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await conversations.createIndex({ id: 1 }, { unique: true });
    await conversations.createIndex({ buyerId: 1 });
    await conversations.createIndex({ sellerId: 1 });
    await conversations.createIndex({ listingId: 1 });
    await conversations.createIndex(
      { buyerId: 1, sellerId: 1, listingId: 1 },
      { unique: true },
    );
    await conversations.createIndex({ lastMessageAt: -1 });
    await messages.createIndex({ id: 1 }, { unique: true });
    await messages.createIndex({ conversationId: 1, createdAt: 1 });
    await messages.createIndex({ senderId: 1 });
    await notifications.createIndex({ id: 1 }, { unique: true });
    await notifications.createIndex({ userId: 1, createdAt: -1, id: -1 });
    await notifications.createIndex({ userId: 1, readAt: 1 });
    await notifications.createIndex({ userId: 1, createdAt: -1, readAt: 1 });
    await notifications.createIndex({ userId: 1, sourceEventId: 1 }, { unique: true });

    return {
      db,
      close: () => client.close(),
    };
  } catch (error) {
    await client.close();
    throw new Error("Unable to connect to MongoDB", { cause: error });
  }
};
