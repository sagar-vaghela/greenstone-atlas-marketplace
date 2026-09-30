import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketplaceEvent, Notification } from "@atlas/types";
import { ApiError } from "../../api/client";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, type NotificationPage } from "../../api/notifications";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";
interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  listStatus: RequestStatus;
  readStatus: RequestStatus;
  error: string | null;
  nextCursor?: string;
}
const initialState: NotificationsState = { items: [], unreadCount: 0, listStatus: "idle", readStatus: "idle", error: null };
const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;
const upsert = (state: NotificationsState, item: Notification) => {
  const index = state.items.findIndex((current) => current.id === item.id);
  if (index < 0) state.items.push(item);
  else state.items[index] = { ...state.items[index], ...item };
  state.items.sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
};

export const fetchNotifications = createAsyncThunk<NotificationPage, { before?: string; limit?: number } | undefined, { rejectValue: string }>("notifications/fetch", async (input, { rejectWithValue }) => { try { return await getNotifications(input?.before, input?.limit); } catch (error) { return rejectWithValue(message(error, "Unable to load notifications.")); } });
export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>("notifications/unreadCount", async (_, { rejectWithValue }) => { try { return (await getUnreadNotificationCount()).unreadCount; } catch (error) { return rejectWithValue(message(error, "Unable to load unread notifications.")); } });
export const markNotificationReadAction = createAsyncThunk<{ notification: Notification; unreadCount: number }, string, { rejectValue: string }>("notifications/read", async (id, { rejectWithValue }) => { try { return await markNotificationRead(id); } catch (error) { return rejectWithValue(message(error, "Unable to mark notification as read.")); } });
export const markAllNotificationsReadAction = createAsyncThunk<number, void, { rejectValue: string }>("notifications/readAll", async (_, { rejectWithValue }) => { try { return (await markAllNotificationsRead()).unreadCount; } catch (error) { return rejectWithValue(message(error, "Unable to mark notifications as read.")); } });

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    notificationEventReceived: (state, action: PayloadAction<{ event: MarketplaceEvent }>) => {
      if (action.payload.event.type !== "notification.created" || !("notification" in action.payload.event.payload)) return;
      const notification = action.payload.event.payload.notification;
      if (state.items.some((item) => item.id === notification.id)) return;
      upsert(state, notification);
      if (!notification.readAt) state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.listStatus = "loading"; state.error = null; })
      .addCase(fetchNotifications.fulfilled, (state, action) => { state.listStatus = "succeeded"; for (const item of action.payload.items) upsert(state, item); state.nextCursor = action.payload.nextCursor; })
      .addCase(fetchNotifications.rejected, (state, action) => { state.listStatus = "failed"; state.error = action.payload ?? "Unable to load notifications."; })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = Math.max(0, action.payload); })
      .addCase(fetchUnreadCount.rejected, (state, action) => { state.error = action.payload ?? "Unable to load unread notifications."; })
      .addCase(markNotificationReadAction.pending, (state) => { state.readStatus = "loading"; })
      .addCase(markNotificationReadAction.fulfilled, (state, action) => { state.readStatus = "succeeded"; upsert(state, action.payload.notification); state.unreadCount = Math.max(0, action.payload.unreadCount); })
      .addCase(markNotificationReadAction.rejected, (state, action) => { state.readStatus = "failed"; state.error = action.payload ?? "Unable to mark notification as read."; })
      .addCase(markAllNotificationsReadAction.fulfilled, (state, action) => { state.unreadCount = Math.max(0, action.payload); for (const item of state.items) item.readAt ??= new Date().toISOString(); })
      .addCase(markAllNotificationsReadAction.rejected, (state, action) => { state.error = action.payload ?? "Unable to mark notifications as read."; });
  },
});
export const { notificationEventReceived } = notificationsSlice.actions;
export const selectNotifications = (state: { notifications: NotificationsState }) => state.notifications.items;
export const selectNotificationState = (state: { notifications: NotificationsState }) => state.notifications;
export default notificationsSlice.reducer;
