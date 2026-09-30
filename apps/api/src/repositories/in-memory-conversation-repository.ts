import { randomUUID } from "node:crypto";
import type { Conversation, Message } from "@atlas/types";
import type {
  ConversationRecord,
  ConversationRepository,
  CreateConversationRepositoryInput,
  MessagePage,
} from "./conversation-repository.js";

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations: ConversationRecord[] = [];
  private readonly messages: Message[] = [];

  async findById(id: string): Promise<ConversationRecord | undefined> {
    const conversation = this.conversations.find((item) => item.id === id);
    return conversation ? copyConversation(conversation) : undefined;
  }

  async findForListingBuyer(
    listingId: string,
    buyerId: string,
  ): Promise<ConversationRecord | undefined> {
    const conversation = this.conversations.find(
      (item) => item.listingId === listingId && item.buyerId === buyerId,
    );
    return conversation ? copyConversation(conversation) : undefined;
  }

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    return this.conversations
      .filter((item) => item.buyerId === userId || item.sellerId === userId)
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt))
      .map(copyConversation);
  }

  async create(
    input: CreateConversationRepositoryInput,
  ): Promise<ConversationRecord> {
    const timestamp = new Date().toISOString();
    const conversation: ConversationRecord = {
      ...input,
      id: `conversation-${randomUUID()}`,
      lastMessageAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.conversations.push(conversation);
    return copyConversation(conversation);
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<Message> {
    const timestamp = new Date().toISOString();
    const message: Message = {
      id: `message-${randomUUID()}`,
      conversationId,
      senderId,
      body,
      createdAt: timestamp,
    };
    this.messages.push(message);
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (conversation) {
      conversation.lastMessageAt = timestamp;
      conversation.lastMessagePreview = body.slice(0, 160);
      conversation.updatedAt = timestamp;
    }
    return { ...message };
  }

  async listMessages(
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<MessagePage> {
    const filtered = this.messages
      .filter(
        (message) =>
          message.conversationId === conversationId &&
          (!before || message.createdAt < before),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
    const page = filtered.slice(0, limit);
    return {
      items: page.reverse().map((message) => ({ ...message })),
      nextCursor: filtered.length > limit ? page[page.length - 1]?.createdAt : undefined,
    };
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (!conversation) return 0;
    const readAt = conversation.buyerId === userId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
    return this.messages.filter(
      (message) =>
        message.conversationId === conversationId &&
        message.senderId !== userId &&
        (!readAt || message.createdAt > readAt),
    ).length;
  }

  async markRead(
    conversationId: string,
    userId: string,
    readAt: string,
  ): Promise<ConversationRecord | undefined> {
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (!conversation) return undefined;
    if (conversation.buyerId === userId) conversation.buyerLastReadAt = readAt;
    if (conversation.sellerId === userId) conversation.sellerLastReadAt = readAt;
    for (const message of this.messages) {
      if (
        message.conversationId === conversationId &&
        message.senderId !== userId &&
        message.createdAt <= readAt
      ) {
        message.readAt = readAt;
      }
    }
    return copyConversation(conversation);
  }
}

const copyConversation = (conversation: ConversationRecord): ConversationRecord => ({
  ...conversation,
});

