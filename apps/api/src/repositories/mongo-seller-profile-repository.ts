import type { Collection, ObjectId } from "mongodb";
import type { SellerProfile } from "@atlas/types";
import type {
  CreateSellerProfileInput,
  SellerProfileRepository,
} from "./seller-profile-repository.js";

interface SellerProfileDocument extends SellerProfile {
  _id?: ObjectId;
}

const toProfile = (document: SellerProfileDocument): SellerProfile => {
  const { _id: _ignoredId, ...profile } = document;
  return profile;
};

export class MongoSellerProfileRepository implements SellerProfileRepository {
  constructor(private readonly collection: Collection<SellerProfileDocument>) {}

  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ userId: 1 }, { unique: true });
  }

  async findByUserId(userId: string): Promise<SellerProfile | undefined> {
    const document = await this.collection.findOne(
      { userId },
      { projection: { _id: 0 } },
    );
    return document ? toProfile(document) : undefined;
  }

  async create(input: CreateSellerProfileInput): Promise<SellerProfile> {
    const timestamp = new Date().toISOString();
    const profile: SellerProfileDocument = {
      userId: input.userId,
      memberSince: input.memberSince ?? timestamp,
      verificationStatus: input.verificationStatus ?? "unverified",
      responseRate: input.responseRate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.collection.insertOne(profile);
    return toProfile(profile);
  }

  async update(
    userId: string,
    input: Parameters<SellerProfileRepository["update"]>[1],
  ): Promise<SellerProfile | undefined> {
    const document = await this.collection.findOneAndUpdate(
      { userId },
      { $set: { ...input, updatedAt: new Date().toISOString() } },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return document ? toProfile(document) : undefined;
  }
}
