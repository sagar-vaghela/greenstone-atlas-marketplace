import type { Conversation, ConversationSummary, Message, SellerPublicUser } from "@atlas/types";
import {
  createConversationSchema,
  createMessageSchema,
  messagePaginationSchema,
} from "@atlas/validation";
import type { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import type { ConversationRecord, ConversationRepository } from "../repositories/conversation-repository.js";
import type { ListingRepository } from "../repositories/listing-repository.js";
import type { UserRepository } from "../repositories/user-repository.js";

interface Options {
  conversations: ConversationRepository;
  listings: ListingRepository;
  users: UserRepository;
  eventBus: MarketplaceEventBus;
}
interface IdParams { id: string }
interface ConversationQuery { limit?: string; before?: string }

const error = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.status(status).send({ error: { code, message } });

const isParticipant = (conversation: ConversationRecord, userId: string): boolean =>
  conversation.buyerId === userId || conversation.sellerId === userId;

const publicConversation = (conversation: ConversationRecord): Conversation => {
  const { buyerLastReadAt: _buyerLastReadAt, sellerLastReadAt: _sellerLastReadAt, ...result } = conversation;
  return result;
};

const summary = async (
  conversation: ConversationRecord,
  userId: string,
  options: Options,
): Promise<ConversationSummary | undefined> => {
  const [listing, participant, unreadCount] = await Promise.all([
    options.listings.findById(conversation.listingId),
    options.users.findById(conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId),
    options.conversations.countUnread(conversation.id, userId),
  ]);
  if (!listing || !participant) return undefined;
  const otherParticipant: SellerPublicUser = {
    id: participant.id,
    displayName: participant.displayName,
  };
  return {
    ...publicConversation(conversation),
    listing: { id: listing.id, title: listing.title, images: listing.images },
    otherParticipant,
    unreadCount,
  };
};

const getAuthorizedConversation = async (
  id: string,
  userId: string,
  options: Options,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): Promise<ConversationRecord | undefined> => {
  const conversation = await options.conversations.findById(id);
  if (!conversation) {
    error(reply, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    return undefined;
  }
  if (!isParticipant(conversation, userId)) {
    error(reply, 403, "FORBIDDEN", "You don't have permission to access this conversation.");
    return undefined;
  }
  return conversation;
};

export const registerConversationRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.post<{ Body: unknown }>("/conversations", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const parsed = createConversationSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, 400, "VALIDATION_ERROR", "Invalid conversation details.");
    const listing = await options.listings.findById(parsed.data.listingId);
    if (!listing) return error(reply, 404, "LISTING_NOT_FOUND", "Listing not found.");
    if (listing.sellerId === user.id) return error(reply, 403, "FORBIDDEN", "You cannot message yourself.");
    const existing = await options.conversations.findForListingBuyer(listing.id, user.id);
    if (existing) return reply.status(200).send(await summary(existing, user.id, options));
    const conversation = await options.conversations.create({
      listingId: listing.id,
      buyerId: user.id,
      sellerId: listing.sellerId,
    });
    return reply.status(201).send(await summary(conversation, user.id, options));
  });

  app.get("/conversations", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const conversations = await options.conversations.listForUser(user.id);
    const items = (await Promise.all(conversations.map((item) => summary(item, user.id, options)))).filter(
      (item): item is ConversationSummary => Boolean(item),
    );
    return { items };
  });

  app.get<{ Params: IdParams }>("/conversations/:id", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const conversation = await getAuthorizedConversation(request.params.id, user.id, options, reply);
    if (!conversation) return;
    return summary(conversation, user.id, options);
  });

  app.get<{ Params: IdParams; Querystring: ConversationQuery }>("/conversations/:id/messages", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const conversation = await getAuthorizedConversation(request.params.id, user.id, options, reply);
    if (!conversation) return;
    const parsed = messagePaginationSchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 400, "VALIDATION_ERROR", "Invalid message pagination.");
    return options.conversations.listMessages(conversation.id, parsed.data.limit, parsed.data.before);
  });

  app.post<{ Params: IdParams; Body: unknown }>("/conversations/:id/messages", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const conversation = await getAuthorizedConversation(request.params.id, user.id, options, reply);
    if (!conversation) return;
    const parsed = createMessageSchema.safeParse(request.body);
    if (!parsed.success) return error(reply, 400, "VALIDATION_ERROR", "Message must contain 1 to 2,000 characters.");
    const message = await options.conversations.createMessage(conversation.id, user.id, parsed.data.body);
    const recipientUserId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
    options.eventBus.publish(
      {
        type: "message.created",
        listingId: conversation.listingId,
        offerId: conversation.offerId,
        actorUserId: user.id,
        recipientUserId,
        payload: { message },
      },
      [recipientUserId],
    );
    return reply.status(201).send(message);
  });

  app.post<{ Params: IdParams }>("/conversations/:id/read", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const conversation = await getAuthorizedConversation(request.params.id, user.id, options, reply);
    if (!conversation) return;
    const readAt = new Date().toISOString();
    const updated = await options.conversations.markRead(conversation.id, user.id, readAt);
    if (!updated) return error(reply, 404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    const recipientUserId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
    options.eventBus.publish(
      {
        type: "conversation.read",
        listingId: conversation.listingId,
        offerId: conversation.offerId,
        actorUserId: user.id,
        recipientUserId,
        payload: { conversationId: conversation.id, readAt },
      },
      [recipientUserId],
    );
    return { conversation: publicConversation(updated), unreadCount: 0 };
  });
};
