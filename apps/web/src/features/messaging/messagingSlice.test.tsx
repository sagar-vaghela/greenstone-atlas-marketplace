import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
} from "../../api/messaging";
import reducer, {
  clearMessagingError,
  clearTypingIndicator,
  createConversationAction,
  fetchConversation,
  fetchConversations,
  fetchMessages,
  markConversationReadAction,
  messageEventReceived,
  resetMessaging,
  sendMessageAction,
  typingEventReceived,
} from "./messagingSlice";

vi.mock("../../api/messaging", () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getConversations: vi.fn(),
  getMessages: vi.fn(),
  markConversationRead: vi.fn(),
  sendMessage: vi.fn(),
}));

const conversation = (id = "conversation-1", unreadCount = 1) =>
  ({
    id,
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    lastMessageAt: "2025-01-02T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    listing: { id: "listing-1", title: "Chair", images: [] },
    otherParticipant: { id: "seller-1", displayName: "Seller" },
    unreadCount,
  }) as never;

const message = (id = "message-1", createdAt = "2025-01-02T00:00:00Z") =>
  ({
    id,
    conversationId: "conversation-1",
    senderId: "seller-1",
    body: `Message ${id}`,
    createdAt,
  }) as never;

const store = () => configureStore({ reducer: { messaging: reducer } });

describe("messaging slice", () => {
  it("handles conversation thunks and their errors", async () => {
    const app = store();
    vi.mocked(getConversations).mockResolvedValueOnce([conversation()]);
    await app.dispatch(fetchConversations());
    expect(app.getState().messaging.listStatus).toBe("succeeded");
    vi.mocked(createConversation).mockResolvedValueOnce(conversation("new"));
    await app.dispatch(createConversationAction("listing-1"));
    expect(app.getState().messaging.conversations.new).toBeDefined();
    vi.mocked(getConversation).mockRejectedValueOnce(new ApiError("missing", 404));
    await app.dispatch(fetchConversation("missing"));
    expect(app.getState().messaging.error).toBe("missing");

    vi.mocked(getConversations).mockRejectedValueOnce(new Error("offline"));
    await app.dispatch(fetchConversations());
    expect(app.getState().messaging.error).toBe("Unable to load your conversations.");
    vi.mocked(createConversation).mockRejectedValueOnce(new Error("failed"));
    await app.dispatch(createConversationAction("listing-1"));
    expect(app.getState().messaging.error).toBe("Unable to start a conversation.");
  });

  it("loads, merges, sends, reads messages, and records failures", async () => {
    const app = store();
    vi.mocked(getMessages).mockResolvedValueOnce({
      items: [message("old", "2025-01-01T00:00:00Z"), message()],
      nextCursor: "cursor",
    });
    await app.dispatch(fetchMessages({ id: "conversation-1" }));
    expect(
      app.getState().messaging.messagesByConversation["conversation-1"],
    ).toMatchObject({
      status: "succeeded",
      nextCursor: "cursor",
    });
    vi.mocked(sendMessage).mockResolvedValueOnce(message("sent"));
    await app.dispatch(sendMessageAction({ id: "conversation-1", body: "Hi" }));
    expect(app.getState().messaging.messageStatus).toBe("succeeded");
    vi.mocked(markConversationRead).mockResolvedValueOnce({
      notificationUnreadCount: 0,
      notificationReadAt: "2025-01-03T00:00:00Z",
    });
    await app.dispatch(markConversationReadAction("conversation-1"));

    vi.mocked(getMessages).mockRejectedValueOnce(new Error("offline"));
    await app.dispatch(fetchMessages({ id: "conversation-1", before: "cursor" }));
    expect(
      app.getState().messaging.messagesByConversation["conversation-1"].error,
    ).toBe("Unable to load messages.");
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error("offline"));
    await app.dispatch(sendMessageAction({ id: "conversation-1", body: "Hi" }));
    expect(app.getState().messaging.error).toBe("Unable to send your message.");
  });

  it("updates message and typing state from realtime events and supports reset", () => {
    let state = reducer(undefined, { type: "init" });
    state = reducer(state, fetchConversations.fulfilled([conversation()], "req"));
    const baseEvent = {
      id: "event-1",
      listingId: "listing-1",
      timestamp: "2025-01-03T00:00:00Z",
      actorUserId: "seller-1",
      recipientUserId: "buyer-1",
    };
    state = reducer(
      state,
      messageEventReceived({
        userId: "buyer-1",
        activeConversationId: undefined,
        event: {
          ...baseEvent,
          type: "message.created",
          payload: { message: message() },
        } as never,
      }),
    );
    expect(state.conversations["conversation-1"].unreadCount).toBe(2);
    state = reducer(
      state,
      typingEventReceived({
        userId: "buyer-1",
        event: {
          ...baseEvent,
          type: "conversation.typing",
          payload: { conversationId: "conversation-1", isTyping: true },
        } as never,
      }),
    );
    expect(state.typingByConversation["conversation-1"].userId).toBe("seller-1");
    state = reducer(
      state,
      clearTypingIndicator({
        conversationId: "conversation-1",
        userId: "seller-1",
        updatedAt: state.typingByConversation["conversation-1"].updatedAt,
      }),
    );
    expect(state.typingByConversation["conversation-1"]).toBeUndefined();
    state = reducer(state, clearMessagingError());
    state = reducer(state, resetMessaging());
    expect(state).toMatchObject({ conversations: {}, messagesByConversation: {} });
  });
});
