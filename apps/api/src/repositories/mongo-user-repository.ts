import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user-repository.js";
import { normalizeEmail } from "./user-repository.js";

interface UserDocument extends UserRecord {
  _id?: ObjectId;
}
const toUser = (document: UserDocument): UserRecord => {
  const { _id: _ignoredId, ...user } = document;
  return user;
};

export class MongoUserRepository implements UserRepository {
  constructor(private readonly collection: Collection<UserDocument>) {}
  async findById(id: string): Promise<UserRecord | undefined> {
    const document = await this.collection.findOne(
      { id },
      { projection: { _id: 0 } },
    );
    return document ? toUser(document) : undefined;
  }
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const document = await this.collection.findOne(
      { email: normalizeEmail(email) },
      { projection: { _id: 0 } },
    );
    return document ? toUser(document) : undefined;
  }
  async create(input: CreateUserInput): Promise<UserRecord> {
    const timestamp = new Date().toISOString();
    const user: UserRecord = {
      id: input.id ?? `user-${randomUUID()}`,
      email: normalizeEmail(input.email),
      displayName: input.displayName.trim(),
      role: input.role ?? "buyer",
      passwordHash: input.passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.collection.insertOne(user);
    return user;
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<UserRecord | undefined> {
    const document = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: {
          displayName: displayName.trim(),
          updatedAt: new Date().toISOString(),
        },
      },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    return document ? toUser(document) : undefined;
  }
}
