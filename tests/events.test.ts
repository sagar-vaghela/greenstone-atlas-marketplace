import { describe, expect, it } from "vitest";
import { MarketplaceEventBus } from "../apps/api/src/events/marketplace-event-bus.js";
import transactionReducer, {
  transactionEventReceived,
} from "../apps/web/src/features/transactions/transactionsSlice";
import type { MarketplaceEvent } from "@atlas/types";
import messagingReducer, {
  clearTypingIndicator,
  typingEventReceived,
} from "../apps/web/src/features/messaging/messagingSlice";

const typingEvent = (
  isTyping: boolean,
  timestamp: string,
  actorUserId = "seller-1",
  recipientUserId = "buyer-1",
): MarketplaceEvent => ({
  id: `event-${timestamp}`,
  type: "conversation.typing",
  timestamp,
  listingId: "listing-1",
  actorUserId,
  recipientUserId,
  payload: { conversationId: "conversation-1", isTyping },
});

describe("marketplace realtime events", () => {
  it("publishes only to authenticated recipients and de-duplicates recipients", () => {
    const bus = new MarketplaceEventBus();
    const buyer: unknown[] = [];
    const seller: unknown[] = [];
    bus.subscribe("buyer-1", (event) => buyer.push(event));
    bus.subscribe("seller-1", (event) => seller.push(event));
    const event = bus.publish(
      {
        type: "message.created",
        listingId: "listing-1",
        actorUserId: "buyer-1",
        payload: {
          message: {
            id: "m",
            conversationId: "c",
            senderId: "buyer-1",
            body: "hi",
            createdAt: new Date().toISOString(),
          },
        },
      },
      ["buyer-1", "buyer-1"],
    );
    expect(buyer).toHaveLength(1);
    expect(seller).toHaveLength(0);
    expect(event.id).toMatch(/^event-/);
    bus.close();
  });

  it("rejects stale transaction versions from realtime updates", () => {
    const current = {
      id: "tx-1",
      listingId: "listing-1",
      offerId: "offer-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      amount: 100,
      currency: "AED",
      status: "paid" as const,
      paymentStatus: "paid" as const,
      fulfilmentStatus: "shipped" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      version: 2,
    };
    const stale = {
      ...current,
      status: "pending_payment" as const,
      paymentStatus: "pending" as const,
      fulfilmentStatus: "pending" as const,
      version: 1,
    };
    const state = transactionReducer(
      undefined,
      transactionEventReceived({ transaction: current }),
    );
    const next = transactionReducer(
      state,
      transactionEventReceived({ transaction: stale }),
    );
    expect(next.items["tx-1"]).toMatchObject({ status: "paid", version: 2 });
  });

  it("tracks typing only for the recipient and ignores stale or unrelated stops", () => {
    const firstTimestamp = "2026-10-01T12:00:00.000Z";
    const refreshedTimestamp = "2026-10-01T12:00:02.000Z";
    const active = messagingReducer(
      undefined,
      typingEventReceived({
        event: typingEvent(true, firstTimestamp),
        userId: "buyer-1",
      }),
    );
    expect(active.typingByConversation["conversation-1"]).toEqual({
      userId: "seller-1",
      updatedAt: firstTimestamp,
    });

    const ignoredRecipient = messagingReducer(
      active,
      typingEventReceived({
        event: typingEvent(true, refreshedTimestamp),
        userId: "buyer-2",
      }),
    );
    expect(
      ignoredRecipient.typingByConversation["conversation-1"]?.updatedAt,
    ).toBe(firstTimestamp);

    const refreshed = messagingReducer(
      active,
      typingEventReceived({
        event: typingEvent(true, refreshedTimestamp),
        userId: "buyer-1",
      }),
    );
    const staleClear = messagingReducer(
      refreshed,
      clearTypingIndicator({
        conversationId: "conversation-1",
        userId: "seller-1",
        updatedAt: firstTimestamp,
      }),
    );
    expect(staleClear.typingByConversation["conversation-1"]?.updatedAt).toBe(
      refreshedTimestamp,
    );

    const unrelatedStop = messagingReducer(
      staleClear,
      typingEventReceived({
        event: typingEvent(false, refreshedTimestamp, "seller-2"),
        userId: "buyer-1",
      }),
    );
    expect(unrelatedStop.typingByConversation["conversation-1"]?.userId).toBe(
      "seller-1",
    );

    const stopped = messagingReducer(
      unrelatedStop,
      typingEventReceived({
        event: typingEvent(false, refreshedTimestamp),
        userId: "buyer-1",
      }),
    );
    expect(stopped.typingByConversation["conversation-1"]).toBeUndefined();
  });
});
