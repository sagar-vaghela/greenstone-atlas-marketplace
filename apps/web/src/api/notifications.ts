import type { Notification } from "@atlas/types";
import { request } from "./client";

export interface NotificationPage { items: Notification[]; nextCursor?: string }
export const getNotifications = (before?: string, limit = 30) => request<NotificationPage>(`/notifications?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ""}`);
export const getUnreadNotificationCount = () => request<{ unreadCount: number }>("/notifications/unread-count");
export const markNotificationRead = (id: string) => request<{ notification: Notification; unreadCount: number }>(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
export const markAllNotificationsRead = () => request<{ updated: number; unreadCount: number }>("/notifications/read-all", { method: "POST" });
