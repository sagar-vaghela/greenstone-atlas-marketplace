import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  ConversationSummary,
  MarketplaceEvent,
  Message,
} from "@atlas/types";
import { ApiError } from "../../api/client";
import {
  createConversation,
  getConversation,
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
  type MessagePage,
} from "../../api/messaging";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";
interface MessageState {
  items: Message[];
  nextCursor?: string;
  status: RequestStatus;
  error: string | null;
}
interface TypingIndicator {
  userId: string;
  updatedAt: string;
}
interface MessagingState {
  conversations: Record<string, ConversationSummary>;
  messagesByConversation: Record<string, MessageState>;
  typingByConversation: Record<string, TypingIndicator>;
  listStatus: RequestStatus;
  messageStatus: RequestStatus;
  error: string | null;
}
const initialState: MessagingState = {
  conversations: {},
  messagesByConversation: {},
  typingByConversation: {},
  listStatus: "idle",
  messageStatus: "idle",
  error: null,
};
const emptyMessages: Message[] = [];
const emptyMessageState: MessageState = {
  items: emptyMessages,
  status: "idle",
  error: null,
};
const message = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;
const upsertMessage = (state: MessagingState, incoming: Message) => {
  const current = state.messagesByConversation[incoming.conversationId] ?? {
    items: [],
    status: "idle" as RequestStatus,
    error: null,
  };
  if (!current.items.some((item) => item.id === incoming.id)) {
    current.items.push(incoming);
    current.items.sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
  }
  state.messagesByConversation[incoming.conversationId] = current;
};
const upsertConversation = (
  state: MessagingState,
  conversation: ConversationSummary,
) => {
  state.conversations[conversation.id] = conversation;
};

export const fetchConversations = createAsyncThunk<
  ConversationSummary[],
  void,
  { rejectValue: string }
>("messaging/fetchConversations", async (_, { rejectWithValue }) => {
  try {
    return await getConversations();
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to load your conversations."),
    );
  }
});
export const createConversationAction = createAsyncThunk<
  ConversationSummary,
  string,
  { rejectValue: string }
>("messaging/createConversation", async (listingId, { rejectWithValue }) => {
  try {
    return await createConversation(listingId);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to start a conversation."));
  }
});
export const fetchConversation = createAsyncThunk<
  ConversationSummary,
  string,
  { rejectValue: string }
>("messaging/fetchConversation", async (id, { rejectWithValue }) => {
  try {
    return await getConversation(id);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to load this conversation."));
  }
});
export const fetchMessages = createAsyncThunk<
  MessagePage,
  { id: string; before?: string },
  { rejectValue: string }
>("messaging/fetchMessages", async ({ id, before }, { rejectWithValue }) => {
  try {
    return await getMessages(id, before);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to load messages."));
  }
});
export const sendMessageAction = createAsyncThunk<
  Message,
  { id: string; body: string },
  { rejectValue: string }
>("messaging/sendMessage", async ({ id, body }, { rejectWithValue }) => {
  try {
    return await sendMessage(id, body);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to send your message."));
  }
});
export const markConversationReadAction = createAsyncThunk<
  {
    conversationId: string;
    notificationUnreadCount: number;
    notificationReadAt: string;
  },
  string,
  { rejectValue: string }
>("messaging/markRead", async (id, { rejectWithValue }) => {
  try {
    const result = await markConversationRead(id);
    return { conversationId: id, ...result };
  } catch (error) {
    return rejectWithValue(message(error, "Unable to mark messages as read."));
  }
});

const messagingSlice = createSlice({
  name: "messaging",
  initialState,
  reducers: {
    messageEventReceived: (
      state,
      action: PayloadAction<{
        event: MarketplaceEvent;
        userId: string;
        activeConversationId?: string;
      }>,
    ) => {
      const { event, userId, activeConversationId } = action.payload;
      if (
        event.type === "message.created" &&
        "message" in event.payload &&
        event.recipientUserId === userId
      ) {
        upsertMessage(state, event.payload.message);
        const conversation =
          state.conversations[event.payload.message.conversationId];
        if (conversation) {
          conversation.lastMessageAt = event.payload.message.createdAt;
          conversation.lastMessagePreview = event.payload.message.body.slice(
            0,
            160,
          );
          if (activeConversationId === conversation.id)
            conversation.unreadCount = 0;
          else conversation.unreadCount += 1;
        }
      }
      if (
        event.type === "conversation.read" &&
        "conversationId" in event.payload &&
        event.actorUserId === userId
      ) {
        const conversation = state.conversations[event.payload.conversationId];
        if (conversation) conversation.unreadCount = 0;
      }
    },
    typingEventReceived: (
      state,
      action: PayloadAction<{ event: MarketplaceEvent; userId: string }>,
    ) => {
      const { event, userId } = action.payload;
      if (
        event.type !== "conversation.typing" ||
        event.recipientUserId !== userId ||
        !event.actorUserId ||
        !("isTyping" in event.payload)
      )
        return;
      const { conversationId, isTyping } = event.payload;
      const current = state.typingByConversation[conversationId];
      if (isTyping)
        state.typingByConversation[conversationId] = {
          userId: event.actorUserId,
          updatedAt: event.timestamp,
        };
      else if (current?.userId === event.actorUserId)
        delete state.typingByConversation[conversationId];
    },
    clearTypingIndicator: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        updatedAt: string;
      }>,
    ) => {
      const current = state.typingByConversation[action.payload.conversationId];
      if (
        current?.userId === action.payload.userId &&
        current.updatedAt === action.payload.updatedAt
      ) {
        delete state.typingByConversation[action.payload.conversationId];
      }
    },
    clearMessagingError: (state) => {
      state.error = null;
    },
    resetMessaging: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        for (const item of action.payload) upsertConversation(state, item);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.payload ?? "Unable to load your conversations.";
      })
      .addCase(createConversationAction.fulfilled, (state, action) => {
        upsertConversation(state, action.payload);
      })
      .addCase(createConversationAction.rejected, (state, action) => {
        state.error = action.payload ?? "Unable to start a conversation.";
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        upsertConversation(state, action.payload);
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.error = action.payload ?? "Unable to load this conversation.";
      })
      .addCase(fetchMessages.pending, (state, action) => {
        const current = state.messagesByConversation[action.meta.arg.id] ?? {
          items: [],
          status: "idle" as RequestStatus,
          error: null,
        };
        current.status = "loading";
        current.error = null;
        state.messagesByConversation[action.meta.arg.id] = current;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const id = action.meta.arg.id;
        const current = state.messagesByConversation[id] ?? {
          items: [],
          status: "idle" as RequestStatus,
          error: null,
        };
        const known = new Set(current.items.map((item) => item.id));
        current.items = [
          ...action.payload.items.filter((item) => !known.has(item.id)),
          ...current.items,
        ].sort(
          (left, right) =>
            left.createdAt.localeCompare(right.createdAt) ||
            left.id.localeCompare(right.id),
        );
        current.nextCursor = action.payload.nextCursor;
        current.status = "succeeded";
        state.messagesByConversation[id] = current;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const id = action.meta.arg.id;
        const current = state.messagesByConversation[id] ?? {
          items: [],
          status: "idle" as RequestStatus,
          error: null,
        };
        current.status = "failed";
        current.error = action.payload ?? "Unable to load messages.";
        state.messagesByConversation[id] = current;
      })
      .addCase(sendMessageAction.pending, (state) => {
        state.messageStatus = "loading";
        state.error = null;
      })
      .addCase(sendMessageAction.fulfilled, (state, action) => {
        state.messageStatus = "succeeded";
        upsertMessage(state, action.payload);
        const conversation = state.conversations[action.payload.conversationId];
        if (conversation) {
          conversation.lastMessageAt = action.payload.createdAt;
          conversation.lastMessagePreview = action.payload.body.slice(0, 160);
        }
      })
      .addCase(sendMessageAction.rejected, (state, action) => {
        state.messageStatus = "failed";
        state.error = action.payload ?? "Unable to send your message.";
      })
      .addCase(markConversationReadAction.fulfilled, (state, action) => {
        const conversation =
          state.conversations[action.payload.conversationId];
        if (conversation) conversation.unreadCount = 0;
      });
  },
});
export const {
  messageEventReceived,
  typingEventReceived,
  clearTypingIndicator,
  clearMessagingError,
  resetMessaging,
} = messagingSlice.actions;
export const selectConversations = createSelector(
  (state: { messaging: MessagingState }) => state.messaging.conversations,
  (conversations) =>
    Object.values(conversations).sort((left, right) =>
      right.lastMessageAt.localeCompare(left.lastMessageAt),
    ),
);
export const selectConversation = (
  state: { messaging: MessagingState },
  id: string | undefined,
) => (id ? (state.messaging.conversations[id] ?? null) : null);
export const selectMessages = (
  state: { messaging: MessagingState },
  id: string | undefined,
) =>
  id
    ? (state.messaging.messagesByConversation[id]?.items ?? emptyMessages)
    : emptyMessages;
export const selectMessageState = (
  state: { messaging: MessagingState },
  id: string | undefined,
) =>
  id
    ? (state.messaging.messagesByConversation[id] ?? emptyMessageState)
    : emptyMessageState;
export const selectTypingIndicator = (
  state: { messaging: MessagingState },
  id: string | undefined,
) => (id ? state.messaging.typingByConversation[id] : undefined);
export const selectMessaging = (state: { messaging: MessagingState }) =>
  state.messaging;
export default messagingSlice.reducer;
