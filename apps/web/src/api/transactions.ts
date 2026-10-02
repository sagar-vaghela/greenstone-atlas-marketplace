import type { DisputeReason, Transaction } from "@atlas/types";
import { request } from "./client";

export const getTransactionById = (id: string): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}`);

export const getMyTransactions = (): Promise<Transaction[]> =>
  request<{ items: Transaction[] }>("/me/transactions").then(
    (result) => result.items,
  );

export interface PaymentIntentResponse {
  transactionId: string;
  provider: string;
  paymentIntentId: string;
  clientSecret?: string;
  status: "pending" | "paid" | "failed";
}

export const createPaymentIntent = (
  id: string,
  idempotencyKey: string,
): Promise<PaymentIntentResponse> =>
  request<PaymentIntentResponse>(
    `/transactions/${encodeURIComponent(id)}/payment-intent`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );

export const shipTransaction = (id: string): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}/ship`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const deliverTransaction = (id: string): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}/deliver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const completeTransaction = (id: string): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const cancelTransaction = (id: string): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

export const disputeTransaction = (
  id: string,
  details: { reason: DisputeReason; description: string },
): Promise<Transaction> =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}/dispute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
