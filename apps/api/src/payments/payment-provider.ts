export interface PaymentProviderRequest {
  transactionId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  demoOutcome?: "success" | "failure";
}

export interface PaymentProviderResult {
  outcome: "paid" | "failed";
  provider: string;
  failureCode?: string;
  providerReference?: string;
}

export interface PaymentIntentResult {
  provider: string;
  providerReference: string;
  clientSecret?: string;
  status: "pending" | "paid" | "failed";
}

export interface PaymentWebhookEvent {
  id: string;
  type: "payment_succeeded" | "payment_failed";
  providerReference: string;
  failureCode?: string;
}

export interface PaymentProvider {
  createPaymentIntent(
    request: PaymentProviderRequest,
  ): Promise<PaymentIntentResult>;
  retrievePaymentIntent(
    providerReference: string,
  ): Promise<PaymentIntentResult>;
  charge(request: PaymentProviderRequest): Promise<PaymentProviderResult>;
  parseWebhookEvent?(
    payload: Buffer,
    signature: string,
  ): PaymentWebhookEvent | undefined;
}

/** Replace this adapter with a real provider at the charge boundary. */
export class DemoPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    request: PaymentProviderRequest,
  ): Promise<PaymentIntentResult> {
    return {
      provider: "demo",
      providerReference: `demo:${request.transactionId}`,
      status: "pending",
    };
  }

  async retrievePaymentIntent(
    providerReference: string,
  ): Promise<PaymentIntentResult> {
    return { provider: "demo", providerReference, status: "pending" };
  }

  async charge(
    request: PaymentProviderRequest,
  ): Promise<PaymentProviderResult> {
    if (request.demoOutcome === "failure") {
      return {
        outcome: "failed",
        provider: "demo",
        failureCode: "demo_declined",
      };
    }
    return { outcome: "paid", provider: "demo" };
  }
}
