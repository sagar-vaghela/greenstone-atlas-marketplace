import { configureStore } from "@reduxjs/toolkit";
import type { MarketplaceEventType, Notification } from "@atlas/types";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import reducer, {
  conversationMessagesRead,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  notificationEventReceived,
} from "./notificationsSlice";

vi.mock("../../api/notifications", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

const notification = (
  id = "notification-1",
  createdAt = "2025-01-02T00:00:00Z",
): Notification =>
  ({
    id,
    userId: "user-1",
    type: "message_received",
    title: `Notification ${id}`,
    body: "You have a message",
    resourceType: "conversation",
    resourceId: "conversation-1",
    sourceEventId: `event-${id}`,
    createdAt,
  }) satisfies Notification;

const store = () => configureStore({ reducer: { notifications: reducer } });

describe("notifications slice", () => {
  it("handles notification list and unread-count thunk success and errors", async () => {
    vi.mocked(getNotifications).mockResolvedValueOnce({
      items: [notification()],
      nextCursor: "next",
    });
    const app = store();
    await app.dispatch(fetchNotifications({ before: "old", limit: 10 }));
    expect(app.getState().notifications).toMatchObject({
      listStatus: "succeeded",
      nextCursor: "next",
      items: [notification()],
    });

    vi.mocked(getUnreadNotificationCount).mockResolvedValueOnce({ unreadCount: -2 });
    await app.dispatch(fetchUnreadCount());
    expect(app.getState().notifications.unreadCount).toBe(0);

    vi.mocked(getNotifications).mockRejectedValueOnce(new Error("offline"));
    await app.dispatch(fetchNotifications());
    expect(app.getState().notifications.error).toBe("Unable to load notifications.");
    vi.mocked(getUnreadNotificationCount).mockRejectedValueOnce(
      new ApiError("forbidden", 403),
    );
    await app.dispatch(fetchUnreadCount());
    expect(app.getState().notifications.error).toBe("forbidden");
  });

  it("marks one and all notifications read, including rejection paths", async () => {
    const app = store();
    vi.mocked(markNotificationRead).mockResolvedValueOnce({
      notification: { ...notification(), readAt: "2025-01-03T00:00:00Z" },
      unreadCount: 2,
    });
    await app.dispatch(markNotificationReadAction("notification-1"));
    expect(app.getState().notifications).toMatchObject({
      readStatus: "succeeded",
      unreadCount: 2,
    });

    vi.mocked(markAllNotificationsRead).mockResolvedValueOnce({
      updated: 1,
      unreadCount: -1,
    });
    await app.dispatch(markAllNotificationsReadAction());
    expect(app.getState().notifications.unreadCount).toBe(0);
    expect(app.getState().notifications.items[0].readAt).toBeDefined();

    vi.mocked(markNotificationRead).mockRejectedValueOnce(new Error("failed"));
    await app.dispatch(markNotificationReadAction("notification-1"));
    expect(app.getState().notifications).toMatchObject({
      readStatus: "failed",
      error: "Unable to mark notification as read.",
    });
    vi.mocked(markAllNotificationsRead).mockRejectedValueOnce(new Error("failed"));
    await app.dispatch(markAllNotificationsReadAction());
    expect(app.getState().notifications.error).toBe(
      "Unable to mark notifications as read.",
    );
  });

  it("handles notification realtime events, deduplication, ordering, and reads", () => {
    let state = reducer(undefined, { type: "init" });
    const event = (
      item: ReturnType<typeof notification>,
      type: MarketplaceEventType = "notification.created",
    ) =>
      notificationEventReceived({
        event: {
          id: item.sourceEventId,
          type,
          listingId: "listing-1",
          timestamp: item.createdAt,
          payload: { notification: item },
        },
      });
    state = reducer(state, event(notification("old", "2025-01-01T00:00:00Z")));
    state = reducer(state, event(notification("new", "2025-01-03T00:00:00Z")));
    expect(state.items.map((item) => item.id)).toEqual(["new", "old"]);
    expect(state.unreadCount).toBe(2);
    state = reducer(state, event(notification("new", "2025-01-03T00:00:00Z")));
    expect(state.unreadCount).toBe(2);
    state = reducer(state, event(notification("ignored"), "offer.created"));
    expect(state.items).toHaveLength(2);
    state = reducer(
      state,
      conversationMessagesRead({
        conversationId: "conversation-1",
        notificationReadAt: "2025-01-04T00:00:00Z",
        unreadCount: -4,
      }),
    );
    expect(state.unreadCount).toBe(0);
    expect(state.items.every((item) => item.readAt)).toBe(true);
  });
});
