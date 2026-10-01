import { describe, expect, it } from "vitest";
import { InMemoryConversationRepository } from "../apps/api/src/repositories/in-memory-conversation-repository.js";
import { InMemoryNotificationRepository } from "../apps/api/src/repositories/in-memory-notification-repository.js";
import { InMemoryOfferRepository } from "../apps/api/src/repositories/in-memory-offer-repository.js";
import { InMemoryTransactionRepository } from "../apps/api/src/repositories/in-memory-transaction-repository.js";

const transactionInput = {
  listingId: "listing-1",
  offerId: "offer-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: 100,
  currency: "AED",
};

describe("in-memory repositories", () => {
  it("preserves transaction versions and payment idempotency", async () => {
    const repository = new InMemoryTransactionRepository();
    const created = await repository.create(transactionInput);
    const failed = await repository.applyPaymentResult(created.id, {
      idempotencyKey: "key-1",
      provider: "demo",
      outcome: "failed",
      failureCode: "declined",
    });
    expect(failed?.transaction.paymentStatus).toBe("failed");
    const retried = await repository.applyPaymentResult(created.id, {
      idempotencyKey: "key-2",
      provider: "demo",
      outcome: "paid",
    });
    expect(retried?.transaction.status).toBe("paid");
    const duplicate = await repository.applyPaymentResult(created.id, {
      idempotencyKey: "key-2",
      provider: "demo",
      outcome: "paid",
    });
    expect(duplicate?.changed).toBe(false);
    expect(duplicate?.transaction.version).toBe(retried?.transaction.version);
  });

  it("enforces offer transitions and separate fulfilment ordering", async () => {
    const offers = new InMemoryOfferRepository();
    await expect(
      offers.updateStatus("offer-1", "accepted"),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(offers.updateStatus("offer-1", "rejected")).rejects.toThrow();
    const transactions = new InMemoryTransactionRepository();
    const transaction = await transactions.create(transactionInput);
    await expect(
      transactions.updateFulfilmentStatus(transaction.id, "shipped"),
    ).rejects.toThrow();
    await transactions.applyPaymentResult(transaction.id, {
      idempotencyKey: "pay",
      provider: "demo",
      outcome: "paid",
    });
    const shipped = await transactions.updateFulfilmentStatus(
      transaction.id,
      "shipped",
    );
    expect(shipped).toMatchObject({
      status: "paid",
      paymentStatus: "paid",
      fulfilmentStatus: "shipped",
    });
    await expect(
      transactions.updateFulfilmentStatus(transaction.id, "delivered"),
    ).resolves.toMatchObject({ fulfilmentStatus: "delivered" });
  });

  it("projects notifications once and scopes read/unread state", async () => {
    const repository = new InMemoryNotificationRepository();
    const input = {
      userId: "buyer-1",
      type: "payment_failed" as const,
      title: "Payment failed",
      body: "Retry",
      resourceType: "transaction" as const,
      resourceId: "tx-1",
      sourceEventId: "event-1",
    };
    const notification = await repository.create(input);
    const messageInput = {
      ...input,
      type: "message_received",
      title: "New message",
      resourceType: "conversation",
      resourceId: "conversation-1",
      sourceEventId: "event-2",
    } as const;
    const messageNotification = await repository.createMessageNotification(
      messageInput,
    );
    expect(messageNotification).toBeDefined();
    expect(
      await repository.createMessageNotification({
        ...messageInput,
        sourceEventId: "event-3",
      }),
    ).toBeUndefined();
    expect(await repository.create(input)).toBeUndefined();
    expect(await repository.countUnread("buyer-1")).toBe(2);
    expect(await repository.countUnread("buyer-2")).toBe(0);
    expect(
      await repository.markRead(
        notification!.id,
        "buyer-2",
        new Date().toISOString(),
      ),
    ).toBeUndefined();
    await repository.markRead(
      notification!.id,
      "buyer-1",
      new Date().toISOString(),
    );
    expect(await repository.countUnread("buyer-1")).toBe(1);
    expect(
      await repository.markConversationRead(
        "buyer-1",
        "conversation-1",
        new Date().toISOString(),
      ),
    ).toBe(1);
    expect(await repository.countUnread("buyer-1")).toBe(0);
    expect(
      await repository.createMessageNotification({
        ...messageInput,
        sourceEventId: "event-4",
      }),
    ).toBeDefined();
    expect(await repository.countUnread("buyer-1")).toBe(1);
  });

  it("prevents message leakage and tracks read state", async () => {
    const repository = new InMemoryConversationRepository();
    const conversation = await repository.create({
      listingId: "listing-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
    });
    const message = await repository.createMessage(
      conversation.id,
      "seller-1",
      "hello",
    );
    expect(await repository.countUnread(conversation.id, "buyer-1")).toBe(1);
    expect(await repository.countUnread(conversation.id, "buyer-2")).toBe(0);
    await repository.markRead(
      conversation.id,
      "buyer-1",
      new Date(new Date(message.createdAt).getTime() + 1).toISOString(),
    );
    expect(await repository.countUnread(conversation.id, "buyer-1")).toBe(0);
  });
});
