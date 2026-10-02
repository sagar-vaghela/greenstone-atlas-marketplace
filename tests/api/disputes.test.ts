import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../apps/api/src/app.js";
import { InMemoryTransactionRepository } from "../../apps/api/src/repositories/in-memory-transaction-repository.js";
import { inject, login } from "./helpers.js";

describe("transaction dispute cases", () => {
  let app: FastifyInstance;
  let transactionRepository: InMemoryTransactionRepository;

  beforeEach(async () => {
    transactionRepository = new InMemoryTransactionRepository();
    app = buildApp({ secureCookies: false, transactionRepository });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  const createPaidTransaction = async () => {
    const seller = await login(app, "seller@example.com", "seller123");
    const accepted = await inject(
      app,
      {
        method: "PATCH",
        url: "/offers/offer-1/status",
        payload: { status: "accepted" },
      },
      seller,
    );
    expect(accepted.statusCode).toBe(200);
    const transaction = accepted.json().transaction;
    const buyer = await login(app, "buyer@example.com", "buyer123");
    await transactionRepository.applyPaymentResult(transaction.id, {
      idempotencyKey: "stripe:event:dispute-test",
      provider: "stripe",
      outcome: "paid",
    });
    return { buyer, transactionId: transaction.id };
  };

  it("validates, saves, and returns dispute information to the participant", async () => {
    const { buyer, transactionId } = await createPaidTransaction();
    const invalid = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transactionId}/dispute`,
        payload: {
          reason: "other",
          description: "Too short",
        },
      },
      buyer,
    );
    expect(invalid.statusCode).toBe(400);

    const opened = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transactionId}/dispute`,
        payload: {
          reason: "other",
          description: "Make it easy",
        },
      },
      buyer,
    );
    expect(opened.statusCode).toBe(200);
    expect(opened.json()).toMatchObject({
      status: "disputed",
      dispute: {
        reason: "other",
        description: "Make it easy",
        openedBy: "demo-buyer",
      },
    });
    expect(opened.json().dispute.caseReference).toMatch(/^DSP-[A-F0-9]{8}$/);

    const stored = await inject(
      app,
      { method: "GET", url: `/transactions/${transactionId}` },
      buyer,
    );
    expect(stored.json().dispute).toEqual(opened.json().dispute);
  });

  it("requires a participant and disallows disputes after the transaction changes state", async () => {
    const { buyer, transactionId } = await createPaidTransaction();
    const otherUser = await login(app, "buyer2@example.com", "buyer123");
    const payload = {
      reason: "other",
      description: "I have a valid explanation to submit for this case.",
    };
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: `/transactions/${transactionId}/dispute`,
            payload,
          },
          otherUser,
        )
      ).statusCode,
    ).toBe(403);

    const first = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transactionId}/dispute`,
        payload,
      },
      buyer,
    );
    expect(first.statusCode).toBe(200);
    const second = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transactionId}/dispute`,
        payload,
      },
      buyer,
    );
    expect(second.statusCode).toBe(409);
  });
});
