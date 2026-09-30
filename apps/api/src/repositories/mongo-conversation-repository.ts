import { randomUUID } from "node:crypto";
import type { Collection, ObjectId } from "mongodb";
import type { Conversation, Message } from "@atlas/types";
import type {
  ConversationRecord,
  ConversationRepository,
  CreateConversationRepositoryInput,
  MessagePage,
} from "./conversation-repository.js";

interface ConversationDocument extends ConversationRecord { _id?: ObjectId }
interface MessageDocument extends Message { _id?: ObjectId }

const toConversation = (document: ConversationDocument): ConversationRecord => {
  const { _id: _ignoredId, ...conversation } = document;
  return conversation;
};
const toMessage = (document: MessageDocument): Message => {
  const { _id: _ignoredId, ...message } = document;
  return message;
};

export class MongoConversationRepository implements ConversationRepository {
  constructor(
    private readonly conversations: Collection<ConversationDocument>,
    private readonly messages: Collection<MessageDocument>,
  ) {}

  async findById(id: string): Promise<ConversationRecord | undefined> {
    const document = await this.conversations.findOne({ id }, { projection: { _id: 0 } });
    return document ? toConversation(document) : undefined;
  }

  async findForListingBuyer(listingId: string, buyerId: string): Promise<ConversationRecord | undefined> {
    const document = await this.conversations.findOne({ listingId, buyerId }, { projection: { _id: 0 } });
    return document ? toConversation(document) : undefined;
  }

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    const documents = await this.conversations
      .find({ $or: [{ buyerId: userId }, { sellerId: userId }] }, { projection: { _id: 0 } })
      .sort({ lastMessageAt: -1, id: -1 })
      .toArray();
    return documents.map(toConversation);
  }

  async create(input: CreateConversationRepositoryInput): Promise<ConversationRecord> {
    const timestamp = new Date().toISOString();
    const conversation: ConversationDocument = {
      ...input,
      id: `conversation-${randomUUID()}`,
      lastMessageAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.conversations.insertOne(conversation);
    return toConversation(conversation);
  }

  async createMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
    const timestamp = new Date().toISOString();
    const message: MessageDocument = {
      id: `message-${randomUUID()}`,
      conversationId,
      senderId,
      body,
      createdAt: timestamp,
    };
    await this.messages.insertOne(message);
    await this.conversations.updateOne(
      { id: conversationId },
      { $set: { lastMessageAt: timestamp, lastMessagePreview: body.slice(0, 160), updatedAt: timestamp } },
    );
    return toMessage(message);
  }

  async listMessages(conversationId: string, limit: number, before?: string): Promise<MessagePage> {
    const filter = { conversationId, ...(before ? { createdAt: { $lt: before } } : {}) };
    const documents = await this.messages
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1, id: -1 })
      .limit(limit + 1)
      .toArray();
    const hasMore = documents.length > limit;
    const page = documents.slice(0, limit).reverse();
    return {
      items: page.map(toMessage),
      nextCursor: hasMore ? page[0]?.createdAt : undefined,
    };
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    const conversation = await this.findById(conversationId);
    if (!conversation) return 0;
    const readAt = conversation.buyerId === userId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
    return this.messages.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      ...(readAt ? { createdAt: { $gt: readAt } } : {}),
    });
  }

  async markRead(conversationId: string, userId: string, readAt: string): Promise<ConversationRecord | undefined> {
    const conversation = await this.findById(conversationId);
    if (!conversation) return undefined;
    const field = conversation.buyerId === userId ? "buyerLastReadAt" : "sellerLastReadAt";
    await this.conversations.updateOne({ id: conversationId }, { $set: { [field]: readAt } });
    await this.messages.updateMany(
      { conversationId, senderId: { $ne: userId }, createdAt: { $lte: readAt }, readAt: { $exists: false } },
      { $set: { readAt } },
    );
    return this.findById(conversationId);
  }
}
