import type { MarketplaceEvent } from "@atlas/types";
import { API_BASE_URL } from "./client";

export type EventConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export const connectMarketplaceEvents = (
  onEvent: (event: MarketplaceEvent) => void,
  onStatus: (status: EventConnectionStatus) => void,
): (() => void) => {
  onStatus("connecting");
  const eventUrl = new URL(`${API_BASE_URL}/events`);
  eventUrl.protocol = eventUrl.protocol === "https:" ? "wss:" : "ws:";

  let closed = false;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let activeSocket: WebSocket | undefined;

  const connect = () => {
    if (closed) return;
    const connection = new WebSocket(eventUrl);
    activeSocket = connection;
    connection.addEventListener("open", () => {
      reconnectAttempts = 0;
      onStatus("connected");
    });
    connection.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      try {
        onEvent(JSON.parse(message.data) as MarketplaceEvent);
      } catch {
        // Ignore malformed events; REST remains authoritative.
      }
    });
    connection.addEventListener("error", () => connection.close());
    connection.addEventListener("close", () => {
      if (activeSocket === connection) activeSocket = undefined;
      if (closed) return;
      onStatus("reconnecting");
      const delay = Math.min(500 * 2 ** reconnectAttempts, 10_000);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  };

  connect();
  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    activeSocket?.close();
    activeSocket = undefined;
    onStatus("disconnected");
  };
};
