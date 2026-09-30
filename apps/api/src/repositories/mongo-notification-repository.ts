import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type { Notification } from "@atlas/types";
import type {
  CreateNotificationInput,
  NotificationPage,
  NotificationRepository,
} from "./notification-repository.js";

interface NotificationDocument extends Notification { _id?: ObjectId }
const toNotification = (document: NotificationDocument): Notification => {
  const { _id: _ignoredId, ...notification } = document;
  return notification;
};

export class MongoNotificationRepository implements NotificationRepository {
  constructor(private readonly collection: Collection<NotificationDocument>) {}

  async create(input: CreateNotificationInput): Promise<Notification | undefined> {
    const notification: NotificationDocument = {
      ...input,
      id: `notification-${randomUUID()}`,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    try {
      await this.collection.insertOne(notification);
      return toNotification(notification);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return undefined;
      throw error;
    }
  }

  async findById(id: string): Promise<Notification | undefined> {
    const document = await this.collection.findOne({ id }, { projection: { _id: 0 } });
    return document ? toNotification(document) : undefined;
  }

  async listForUser(userId: string, limit: number, before?: string): Promise<NotificationPage> {
    const filter = { userId, ...(before ? { createdAt: { $lt: before } } : {}) };
    const documents = await this.collection.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1, id: -1 }).limit(limit + 1).toArray();
    const page = documents.slice(0, limit);
    return { items: page.map(toNotification), nextCursor: documents.length > limit ? page[page.length - 1]?.createdAt : undefined };
  }

  async countUnread(userId: string): Promise<number> {
    return this.collection.countDocuments({ userId, readAt: { $exists: false } });
  }

  async markRead(id: string, userId: string, readAt: string): Promise<Notification | undefined> {
    const document = await this.collection.findOneAndUpdate(
      { id, userId, readAt: { $exists: false } },
      { $set: { readAt } },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    if (document) return toNotification(document);
    return this.findById(id).then((item) => item?.userId === userId ? item : undefined);
  }

  async markAllRead(userId: string, readAt: string): Promise<number> {
    const result = await this.collection.updateMany({ userId, readAt: { $exists: false } }, { $set: { readAt } });
    return result.modifiedCount;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id, userId });
    return result.deletedCount === 1;
  }
}
