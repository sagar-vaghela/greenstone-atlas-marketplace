import { randomUUID } from "node:crypto";
import type { MarketplaceEvent } from "@atlas/types";

export type MarketplaceEventListener = (event: MarketplaceEvent) => void;

export class MarketplaceEventBus {
  private readonly listeners = new Map<string, Set<MarketplaceEventListener>>();

  subscribe(userId: string, listener: MarketplaceEventListener): () => void {
    const listeners = this.listeners.get(userId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(userId, listeners);
    return () => this.unsubscribe(userId, listener);
  }

  unsubscribe(userId: string, listener: MarketplaceEventListener): void {
    const listeners = this.listeners.get(userId);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(userId);
  }

  publish(
    event: Omit<MarketplaceEvent, "id" | "timestamp">,
    recipientUserIds: Iterable<string>,
  ): MarketplaceEvent {
    const completeEvent: MarketplaceEvent = {
      ...event,
      id: `event-${randomUUID()}`,
      timestamp: new Date().toISOString(),
    };
    for (const userId of new Set(recipientUserIds)) {
      for (const listener of this.listeners.get(userId) ?? []) listener(completeEvent);
    }
    return completeEvent;
  }

  close(): void {
    this.listeners.clear();
  }
}