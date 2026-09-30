export interface PaymentProviderRequest {
  transactionId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  demoOutcome: "success" | "failure";
}

export interface PaymentProviderResult {
  outcome: "paid" | "failed";
  provider: string;
  failureCode?: string;
}

export interface PaymentProvider {
  charge(request: PaymentProviderRequest): Promise<PaymentProviderResult>;
}

/** Replace this adapter with a real provider at the charge boundary. */
export class DemoPaymentProvider implements PaymentProvider {
  async charge(request: PaymentProviderRequest): Promise<PaymentProviderResult> {
    if (request.demoOutcome === "failure") {
      return { outcome: "failed", provider: "demo", failureCode: "demo_declined" };
    }
    return { outcome: "paid", provider: "demo" };
  }
}