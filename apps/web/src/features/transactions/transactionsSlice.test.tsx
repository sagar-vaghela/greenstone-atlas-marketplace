import { describe, expect, it } from "vitest";
import type { Transaction } from "@atlas/types";
import { apiClient } from "../../api/client";
import { selectTransactions } from "./transactionsSlice";

describe("frontend hardening regressions", () => {
  it("exposes a centralized api client surface for request helpers", () => {
    expect(apiClient.get).toBeTypeOf("function");
    expect(apiClient.post).toBeTypeOf("function");
    expect(apiClient.patch).toBeTypeOf("function");
    expect(apiClient.delete).toBeTypeOf("function");
  });

  it("keeps transaction selector results stable for identical state", () => {
    const transaction: Transaction = {
      id: "txn-1",
      listingId: "listing-1",
      offerId: "offer-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      amount: 123,
      currency: "USD",
      status: "pending_payment",
      paymentStatus: "pending",
      fulfilmentStatus: "pending",
      version: 1,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    const state: Parameters<typeof selectTransactions>[0] = {
      transactions: {
        items: { [transaction.id]: transaction },
        selectedId: transaction.id,
        listStatus: "succeeded",
        detailStatus: "idle",
        mutationStatus: "idle",
        error: null,
      },
    };

    expect(selectTransactions(state)).toBe(selectTransactions(state));
  });
});
