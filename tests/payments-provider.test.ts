import { describe, expect, it } from "vitest";
import { toStripeMinorUnits } from "../apps/api/src/payments/stripe-payment-provider.js";

describe("Stripe money conversion", () => {
  it("converts AED major units to Stripe fils deterministically", () => {
    expect(toStripeMinorUnits(10, "AED")).toBe(1000);
    expect(toStripeMinorUnits(10.25, "AED")).toBe(1025);
  });

  it("supports zero-decimal currencies without applying AED assumptions", () => {
    expect(toStripeMinorUnits(1000, "JPY")).toBe(1000);
  });

  it("rejects unsafe or negative amounts", () => {
    expect(() => toStripeMinorUnits(-1, "AED")).toThrow();
    expect(() => toStripeMinorUnits(Number.MAX_SAFE_INTEGER, "AED")).toThrow();
  });
});
