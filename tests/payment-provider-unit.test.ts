import { describe, expect, it } from "vitest";
import { DemoPaymentProvider } from "../apps/api/src/payments/payment-provider";

describe("DemoPaymentProvider", () => {
  it("settles payment intents immediately with a transaction reference", async () => {
    const provider = new DemoPaymentProvider();
    await expect(
      provider.createPaymentIntent({
        transactionId: "txn-1",
        amount: 100,
        currency: "AED",
        idempotencyKey: "key-1",
      }),
    ).resolves.toEqual({
      provider: "demo",
      providerReference: "demo:txn-1",
      status: "paid",
    });
  });

  it("returns paid status when retrieving any provider reference", async () => {
    await expect(
      new DemoPaymentProvider().retrievePaymentIntent("demo:txn-1"),
    ).resolves.toEqual({
      provider: "demo",
      providerReference: "demo:txn-1",
      status: "paid",
    });
  });
});
