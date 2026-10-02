export interface PaymentProviderRequest {
  transactionId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
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
  parseWebhookEvent?(
    payload: Buffer,
    signature: string,
  ): PaymentWebhookEvent | undefined;
}

/** Development-only provider that immediately settles a payment for demo flows. */
export class DemoPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    request: PaymentProviderRequest,
  ): Promise<PaymentIntentResult> {
    return {
      provider: "demo",
      providerReference: `demo:${request.transactionId}`,
      status: "paid",
    };
  }

  async retrievePaymentIntent(
    providerReference: string,
  ): Promise<PaymentIntentResult> {
    return { provider: "demo", providerReference, status: "paid" };
  }
}
