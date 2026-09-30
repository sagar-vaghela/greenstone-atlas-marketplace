import "dotenv/config";
import type { AnyBulkWriteOperation, Collection } from "mongodb";
import { connectMongoDB } from "../db/mongodb.js";
import { config } from "../config/index.js";

interface MoneyDocument {
  _id?: unknown;
  id: string;
  currency?: string;
  price?: number;
  amount?: number;
  paymentProviderReference?: string;
}

const rate = Number(process.env.LEGACY_INR_TO_AED_RATE);
if (!Number.isFinite(rate) || rate <= 0) {
  throw new Error(
    "Set LEGACY_INR_TO_AED_RATE to an approved INR-to-AED rate before running this migration",
  );
}

const converted = (amount: number): number =>
  Math.round(amount * rate * 100) / 100;

const migrateCollection = async (
  collection: Collection<MoneyDocument>,
  field: "price" | "amount",
  skipLinkedPayments = false,
): Promise<{ updated: number; skipped: number }> => {
  const documents = await collection.find({ currency: "INR" }).toArray();
  const updates = documents.filter(
    (document) => !(skipLinkedPayments && document.paymentProviderReference),
  );
  const skipped = documents.length - updates.length;
  const operations: AnyBulkWriteOperation<MoneyDocument>[] = updates.map(
    (document) => ({
      updateOne: {
        filter: { _id: document._id, currency: "INR" },
        update: {
          $set: { currency: "AED", [field]: converted(document[field] ?? 0) },
        },
      },
    }),
  );
  if (operations.length > 0) await collection.bulkWrite(operations);
  return { updated: updates.length, skipped };
};

const connection = await connectMongoDB(
  config.mongodbUri ?? "",
  config.mongodbDbName,
);
try {
  const listings = await migrateCollection(
    connection.db.collection<MoneyDocument>("listings"),
    "price",
  );
  const offers = await migrateCollection(
    connection.db.collection<MoneyDocument>("offers"),
    "amount",
  );
  const transactions = await migrateCollection(
    connection.db.collection<MoneyDocument>("transactions"),
    "amount",
    true,
  );
  console.log(JSON.stringify({ rate, listings, offers, transactions }));
} finally {
  await connection.close();
}
