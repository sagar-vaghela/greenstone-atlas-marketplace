import "./load-env.js";
import type { Collection, Document } from "mongodb";
import { hashPassword } from "./auth/password.js";
import { config } from "./config/index.js";
import { connectMongoDB } from "./db/mongodb.js";
import {
  demoConversations,
  demoListings,
  demoMessages,
  demoNotifications,
  demoOffers,
  demoPassword,
  demoSellerProfiles,
  demoTransactions,
  demoUsers,
} from "./seed-marketplace-data.js";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const marketplaceCollections = [
  "users",
  "sessions",
  "sellerProfiles",
  "listings",
  "offers",
  "transactions",
  "conversations",
  "messages",
  "notifications",
] as const;

async function main() {
  if (!config.mongodbUri) {
    throw new Error(
      "MONGODB_URI is missing. Configure it locally before seeding test data.",
    );
  }
  if (
    reset &&
    (process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV === "staging")
  ) {
    throw new Error(
      "Database reset is blocked in production and staging runtimes. Run it locally against the database configured for testing.",
    );
  }

  const connection = await connectMongoDB(
    config.mongodbUri,
    config.mongodbDbName,
    { allowEmptyDatabase: true },
  );

  try {
    const { db } = connection;
    if (reset) {
      console.log(
        `Resetting test data in "${config.mongodbDbName}" (collections: ${marketplaceCollections.join(", ")}).`,
      );
      await Promise.all(
        marketplaceCollections.map((name) => db.collection(name).deleteMany({})),
      );
    }

    const seedTime = "2026-10-01T12:00:00.000Z";
    const users = db.collection("users");
    for (const user of demoUsers) {
      const { password, ...publicFields } = user;
      await users.updateOne(
        { id: user.id },
        {
          $set: {
            ...publicFields,
            passwordHash: hashPassword(password),
            updatedAt: seedTime,
          },
          $setOnInsert: { createdAt: seedTime },
        },
        { upsert: true },
      );
    }

    const profiles = db.collection("sellerProfiles");
    for (const profile of demoSellerProfiles) {
      await profiles.updateOne(
        { userId: profile.userId },
        {
          $set: { ...profile, updatedAt: seedTime },
          $setOnInsert: { createdAt: profile.memberSince },
        },
        { upsert: true },
      );
    }

    await upsertById(db.collection("listings"), demoListings);
    await upsertById(db.collection("offers"), demoOffers);
    await upsertById(db.collection("transactions"), demoTransactions);
    await upsertById(db.collection("conversations"), demoConversations);
    await upsertById(db.collection("messages"), demoMessages);
    await upsertById(db.collection("notifications"), demoNotifications);

    console.log(
      `Seeded "${config.mongodbDbName}" with ${demoUsers.length} demo users, ${demoListings.length} listings, ${demoOffers.length} offers, ${demoTransactions.length} transactions, ${demoConversations.length} conversations, ${demoMessages.length} messages, and ${demoNotifications.length} notifications.`,
    );
    console.log(
      `Demo logins: seller@example.com / ${demoPassword.seller}, buyer@example.com / ${demoPassword.buyer}.`,
    );
  } finally {
    await connection.close();
  }
}

async function upsertById<T extends { id: string }>(
  collection: Collection<Document>,
  documents: T[],
) {
  for (const document of documents) {
    await collection.updateOne(
      { id: document.id },
      { $set: { ...document } },
      { upsert: true },
    );
  }
}

void main().catch((error: unknown) => {
  console.error("Marketplace demo data seed failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
