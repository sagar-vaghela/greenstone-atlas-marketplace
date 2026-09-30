import { randomUUID } from "node:crypto";
import type { Notification } from "@atlas/types";
import type {
  CreateNotificationInput,
  NotificationPage,
  NotificationRepository,
} from "./notification-repository.js";

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly items: Notification[] = [];

  async create(input: CreateNotificationInput): Promise<Notification | undefined> {
    if (this.items.some((item) => item.userId === input.userId && item.sourceEventId === input.sourceEventId)) {
      return undefined;
    }
    const notification: Notification = {
      ...input,
      id: `notification-${randomUUID()}`,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    this.items.push(notification);
    return { ...notification };
  }

  async findById(id: string): Promise<Notification | undefined> {
    const item = this.items.find((notification) => notification.id === id);
    return item ? { ...item } : undefined;
  }

  async listForUser(userId: string, limit: number, before?: string): Promise<NotificationPage> {
    const filtered = this.items
      .filter((item) => item.userId === userId && (!before || item.createdAt < before))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
    const page = filtered.slice(0, limit);
    return {
      items: page.map((item) => ({ ...item })),
      nextCursor: filtered.length > limit ? page[page.length - 1]?.createdAt : undefined,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.items.filter((item) => item.userId === userId && !item.readAt).length;
  }

  async markRead(id: string, userId: string, readAt: string): Promise<Notification | undefined> {
    const item = this.items.find((notification) => notification.id === id && notification.userId === userId);
    if (!item) return undefined;
    item.readAt = item.readAt ?? readAt;
    return { ...item };
  }

  async markAllRead(userId: string, readAt: string): Promise<number> {
    let count = 0;
    for (const item of this.items) {
      if (item.userId === userId && !item.readAt) {
        item.readAt = readAt;
        count += 1;
      }
    }
    return count;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id && item.userId === userId);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }
}
