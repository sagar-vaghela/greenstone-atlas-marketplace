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
    await listings.createIndex({ id: 1 }, { unique: true });
    await listings.createIndex({ category: 1 });
    await listings.createIndex({ price: 1 });
    await listings.createIndex({ updatedAt: -1 });
    await offers.createIndex({ id: 1 }, { unique: true });
    await offers.createIndex({ listingId: 1, createdAt: 1 });
    await offers.createIndex({ buyerId: 1 });
    await offers.createIndex({ sellerId: 1, status: 1 });

    return {
      db,
      close: () => client.close(),
    };
  } catch (error) {
    await client.close();
    throw new Error("Unable to connect to MongoDB", { cause: error });
  }
};
