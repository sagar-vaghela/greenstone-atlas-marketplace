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
    await db.collection("listings").createIndex({ id: 1 }, { unique: true });

    return {
      db,
      close: () => client.close(),
    };
  } catch (error) {
    await client.close();
    throw new Error("Unable to connect to MongoDB", { cause: error });
  }
};
