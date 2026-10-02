import Stripe from "stripe";
import type {
  PaymentIntentResult,
  PaymentProvider,
  PaymentProviderRequest,
  PaymentWebhookEvent,
} from "./payment-provider.js";

const zeroDecimalCurrencies = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
const threeDecimalCurrencies = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export const toStripeMinorUnits = (
  amount: number,
  currency: string,
): number => {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Transaction amount must be a finite positive number");
  const exponent = zeroDecimalCurrencies.has(currency.toLowerCase())
    ? 0
    : threeDecimalCurrencies.has(currency.toLowerCase())
      ? 3
      : 2;
  const [whole, fraction = ""] = String(amount).split(".");
  const normalizedFraction = fraction.padEnd(exponent, "0").slice(0, exponent);
  const minor =
    BigInt(whole) * BigInt(10 ** exponent) + BigInt(normalizedFraction || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Transaction amount is too large");
  return Number(minor);
};

const toResult = (intent: Stripe.PaymentIntent): PaymentIntentResult => ({
  provider: "stripe",
  providerReference: intent.id,
  clientSecret: intent.client_secret ?? undefined,
  status:
    intent.status === "succeeded"
      ? "paid"
      : ["canceled", "requires_payment_method"].includes(intent.status)
        ? "failed"
        : "pending",
});

export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(
    request: PaymentProviderRequest,
  ): Promise<PaymentIntentResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: toStripeMinorUnits(request.amount, request.currency),
          currency: request.currency.toLowerCase(),
          metadata: { transactionId: request.transactionId },
          payment_method_types: ["card"],
        },
        { idempotencyKey: request.idempotencyKey },
      );
      return toResult(intent);
    } catch (error) {
      throw new Error(
        error instanceof Stripe.errors.StripeError
          ? "Stripe payment setup failed"
          : "Payment provider unavailable",
      );
    }
  }

  async retrievePaymentIntent(
    providerReference: string,
  ): Promise<PaymentIntentResult> {
    try {
      return toResult(
        await this.stripe.paymentIntents.retrieve(providerReference),
      );
    } catch (error) {
      throw new Error(
        error instanceof Stripe.errors.StripeError
          ? "Stripe payment lookup failed"
          : "Payment provider unavailable",
      );
    }
  }

  parseWebhookEvent(
    payload: Buffer,
    signature: string,
  ): PaymentWebhookEvent | undefined {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new Error("Invalid Stripe webhook signature");
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type: "payment_succeeded",
        providerReference: intent.id,
      };
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type: "payment_failed",
        providerReference: intent.id,
        failureCode: intent.last_payment_error?.code ?? "payment_failed",
      };
    }
    return undefined;
  }
}
