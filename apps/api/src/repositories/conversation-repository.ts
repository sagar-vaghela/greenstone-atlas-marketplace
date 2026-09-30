import type { Conversation, Message } from "@atlas/types";

export interface ConversationRecord extends Conversation {
  buyerLastReadAt?: string;
  sellerLastReadAt?: string;
}

export interface MessagePage {
  items: Message[];
  nextCursor?: string;
}

export interface CreateConversationRepositoryInput {
  listingId: string;
  buyerId: string;
  sellerId: string;
}

export interface ConversationRepository {
  findById(id: string): Promise<ConversationRecord | undefined>;
  findForListingBuyer(
    listingId: string,
    buyerId: string,
  ): Promise<ConversationRecord | undefined>;
  listForUser(userId: string): Promise<ConversationRecord[]>;
  create(input: CreateConversationRepositoryInput): Promise<ConversationRecord>;
  createMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<Message>;
  listMessages(
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<MessagePage>;
  countUnread(conversationId: string, userId: string): Promise<number>;
  markRead(
    conversationId: string,
    userId: string,
    readAt: string,
  ): Promise<ConversationRecord | undefined>;
}
