import type { MarketplaceEvent, MarketplaceEventType } from "@atlas/types";
import { API_BASE_URL } from "./client";

const eventTypes: MarketplaceEventType[] = [
  "offer.created",
  "offer.countered",
  "offer.accepted",
  "offer.rejected",
  "offer.withdrawn",
  "listing.status_changed",
];

export type EventConnectionStatus = "connecting" | "connected" | "reconnecting";

export const connectMarketplaceEvents = (
  onEvent: (event: MarketplaceEvent) => void,
  onStatus: (status: EventConnectionStatus) => void,
): (() => void) => {
  onStatus("connecting");
  const source = new EventSource(`${API_BASE_URL}/events`, { withCredentials: true });
  source.onopen = () => onStatus("connected");
  source.onerror = () => onStatus("reconnecting");
  for (const type of eventTypes) {
    source.addEventListener(type, (message) => {
      try {
        onEvent(JSON.parse((message as MessageEvent).data) as MarketplaceEvent);
      } catch {
        // Ignore malformed events; REST remains authoritative.
      }
    });
  }
  return () => source.close();
};