import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type { SessionRecord, SessionRepository } from "./session-repository.js";

interface SessionDocument extends SessionRecord {
  _id?: ObjectId;
}
export class MongoSessionRepository implements SessionRepository {
  constructor(private readonly collection: Collection<SessionDocument>) {}
  async findById(id: string): Promise<SessionRecord | undefined> {
    const session = await this.collection.findOne(
      { id },
      { projection: { _id: 0 } },
    );
    return session && new Date(session.expiresAt).getTime() > Date.now()
      ? session
      : undefined;
  }
  async create(userId: string, expiresAt: string): Promise<SessionRecord> {
    const session = {
      id: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    await this.collection.insertOne(session);
    return session;
  }
  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ id });
  }
}
