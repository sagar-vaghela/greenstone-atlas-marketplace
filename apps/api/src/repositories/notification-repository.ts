import type { Notification, NotificationType, NotificationResourceType } from "@atlas/types";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceType: NotificationResourceType;
  resourceId: string;
  sourceEventId: string;
  createdAt?: string;
}

export interface NotificationPage {
  items: Notification[];
  nextCursor?: string;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification | undefined>;
  findById(id: string): Promise<Notification | undefined>;
  listForUser(userId: string, limit: number, before?: string): Promise<NotificationPage>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string, readAt: string): Promise<Notification | undefined>;
  markAllRead(userId: string, readAt: string): Promise<number>;
  delete(id: string, userId: string): Promise<boolean>;
}
