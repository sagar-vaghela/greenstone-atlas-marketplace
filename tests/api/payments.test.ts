import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  PaymentIntentResult,
  PaymentProvider,
  PaymentProviderRequest,
  PaymentProviderResult,
  PaymentWebhookEvent,
} from "../../apps/api/src/payments/payment-provider.js";
import { buildApp } from "../../apps/api/src/app.js";
import { inject, login } from "./helpers.js";
import type { FastifyInstance } from "fastify";

class FakePaymentProvider implements PaymentProvider {
  private lastReference = "";

  async createPaymentIntent(
    request: PaymentProviderRequest,
  ): Promise<PaymentIntentResult> {
    this.lastReference = `pi_${request.transactionId}`;
    return {
      provider: "stripe",
      providerReference: this.lastReference,
      clientSecret: "cs_test_secret",
      status: "pending",
    };
  }

  async retrievePaymentIntent(
    providerReference: string,
  ): Promise<PaymentIntentResult> {
    return {
      provider: "stripe",
      providerReference,
      clientSecret: "cs_test_secret",
      status: "pending",
    };
  }

  async charge(
    _request: PaymentProviderRequest,
  ): Promise<PaymentProviderResult> {
    return {
      provider: "stripe",
      outcome: "failed",
      failureCode: "not_supported",
    };
  }

  parseWebhookEvent(
    _payload: Buffer,
    signature: string,
  ): PaymentWebhookEvent | undefined {
    if (signature === "invalid") throw new Error("invalid signature");
    return {
      id: "evt_payment_1",
      type: "payment_succeeded",
      providerReference: this.lastReference,
    };
  }
}

describe("Stripe payment boundary", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp({
      secureCookies: false,
      paymentProvider: new FakePaymentProvider(),
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates an intent from the server transaction amount and reuses its provider reference", async () => {
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
    const transaction = accepted.json().transaction;
    const buyer = await login(app, "buyer@example.com", "buyer123");

    expect(
      (
        await app.inject({
          method: "POST",
          url: `/transactions/${transaction.id}/payment-intent`,
        })
      ).statusCode,
    ).toBe(401);
    const first = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transaction.id}/payment-intent`,
        headers: { "idempotency-key": "attempt-1" },
        payload: { amount: 1 },
      },
      buyer,
    );
    expect(first.statusCode).toBe(200);
    expect(first.json().paymentIntentId).toBe(`pi_${transaction.id}`);
    expect(first.json().clientSecret).toBe("cs_test_secret");

    const second = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transaction.id}/payment-intent`,
        headers: { "idempotency-key": "attempt-2" },
      },
      buyer,
    );
    expect(second.statusCode).toBe(200);
    expect(second.json().paymentIntentId).toBe(first.json().paymentIntentId);
  });

  it("rejects invalid signatures and reconciles a webhook exactly once", async () => {
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
    const transaction = accepted.json().transaction;
    const buyer = await login(app, "buyer@example.com", "buyer123");
    await inject(
      app,
      { method: "POST", url: `/transactions/${transaction.id}/payment-intent` },
      buyer,
    );

    const invalid = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: {
        "stripe-signature": "invalid",
        "content-type": "application/json",
      },
      payload: Buffer.from("{}"),
    });
    expect(invalid.statusCode).toBe(400);

    const webhook = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: {
        "stripe-signature": "valid",
        "content-type": "application/json",
      },
      payload: Buffer.from("{}"),
    });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.json().duplicate).toBe(false);
    expect(
      (
        await inject(
          app,
          { method: "GET", url: `/transactions/${transaction.id}` },
          buyer,
        )
      ).json().paymentStatus,
    ).toBe("paid");

    const replay = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      headers: {
        "stripe-signature": "valid",
        "content-type": "application/json",
      },
      payload: Buffer.from("{}"),
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().duplicate).toBe(true);
  });
});
