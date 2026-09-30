import type { ConversationSummary, Message } from "@atlas/types";
import { request } from "./client";

interface ConversationsResponse { items: ConversationSummary[] }
export interface MessagePage { items: Message[]; nextCursor?: string }

export function getConversations(): Promise<ConversationSummary[]> {
  return request<ConversationsResponse>("/conversations").then((response) => response.items);
}

export function createConversation(listingId: string): Promise<ConversationSummary> {
  return request<ConversationSummary>("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId }),
  });
}

export function getConversation(id: string): Promise<ConversationSummary> {
  return request<ConversationSummary>(`/conversations/${encodeURIComponent(id)}`);
}

export function getMessages(id: string, before?: string): Promise<MessagePage> {
  const query = new URLSearchParams({ limit: "50" });
  if (before) query.set("before", before);
  return request<MessagePage>(`/conversations/${encodeURIComponent(id)}/messages?${query}`);
}

export function sendMessage(id: string, body: string): Promise<Message> {
  return request<Message>(`/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export function markConversationRead(id: string): Promise<void> {
  return request(`/conversations/${encodeURIComponent(id)}/read`, { method: "POST" }).then(() => undefined);
}
