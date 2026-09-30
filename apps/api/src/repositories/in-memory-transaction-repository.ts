import { randomUUID } from "node:crypto";
import type {
  CreateTransactionInput,
  FulfilmentStatus,
  PaymentStatus,
  Transaction,
  TransactionStatus,
} from "@atlas/types";
import {
  assertValidFulfilmentTransition,
  assertValidPaymentTransition,
  assertValidTransactionTransition,
  InvalidTransactionStateError,
} from "../domain/transaction-status.js";
import type { TransactionRepository } from "./transaction-repository.js";

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly transactions: Transaction[] = [];

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const timestamp = new Date().toISOString();
    const transaction: Transaction = {
      id: `transaction-${randomUUID()}`,
      listingId: input.listingId,
      offerId: input.offerId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      amount: input.amount,
      currency: input.currency,
      status: "pending_payment",
      paymentStatus: "pending",
      fulfilmentStatus: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };
    this.transactions.push(transaction);
    return copy(transaction);
  }

  async findById(id: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    return transaction ? copy(transaction) : undefined;
  }

  async findByPaymentProviderReference(
    providerReference: string,
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.find(
      (item) => item.paymentProviderReference === providerReference,
    );
    return transaction ? copy(transaction) : undefined;
  }

  async findByOfferId(offerId: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.find(
      (item) => item.offerId === offerId,
    );
    return transaction ? copy(transaction) : undefined;
  }

  async findByListingId(listingId: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.find(
      (item) => item.listingId === listingId,
    );
    return transaction ? copy(transaction) : undefined;
  }

  async findForUser(userId: string): Promise<Transaction[]> {
    return this.transactions
      .filter((item) => item.buyerId === userId || item.sellerId === userId)
      .map(copy);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) return undefined;

    assertValidTransactionTransition(transaction.status, status);
    transaction.status = status;
    transaction.updatedAt = new Date().toISOString();
    transaction.version += 1;

    if (status === "completed") {
      transaction.completedAt ??= transaction.updatedAt;
    }
    if (status === "cancelled") {
      transaction.cancelledAt ??= transaction.updatedAt;
    }

    return copy(transaction);
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) return undefined;

    assertValidPaymentTransition(transaction.paymentStatus, paymentStatus);
    if (paymentStatus === "paid" && transaction.status !== "pending_payment") {
      throw new InvalidTransactionStateError(transaction.status, paymentStatus);
    }
    if (paymentStatus === "refunded" && transaction.status !== "cancelled") {
      throw new InvalidTransactionStateError(transaction.status, paymentStatus);
    }

    transaction.paymentStatus = paymentStatus;
    transaction.updatedAt = new Date().toISOString();
    transaction.version += 1;

    return copy(transaction);
  }

  async updateFulfilmentStatus(
    id: string,
    fulfilmentStatus: FulfilmentStatus,
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) return undefined;

    assertValidFulfilmentTransition(
      transaction.fulfilmentStatus,
      fulfilmentStatus,
    );

    if (
      fulfilmentStatus === "shipped" &&
      !(
        transaction.status === "paid" &&
        transaction.paymentStatus === "paid" &&
        transaction.fulfilmentStatus === "pending"
      )
    ) {
      throw new InvalidTransactionStateError(
        transaction.status,
        fulfilmentStatus,
      );
    }

    if (
      fulfilmentStatus === "delivered" &&
      !(
        transaction.status === "paid" &&
        transaction.paymentStatus === "paid" &&
        transaction.fulfilmentStatus === "shipped"
      )
    ) {
      throw new InvalidTransactionStateError(
        transaction.status,
        fulfilmentStatus,
      );
    }

    transaction.fulfilmentStatus = fulfilmentStatus;
    transaction.updatedAt = new Date().toISOString();
    transaction.version += 1;

    return copy(transaction);
  }

  async applyPaymentResult(
    id: string,
    input: {
      idempotencyKey: string;
      provider: string;
      outcome: "paid" | "failed";
      failureCode?: string;
    },
  ): Promise<{ transaction: Transaction; changed: boolean } | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) return undefined;
    if (transaction.paymentAttemptKey === input.idempotencyKey) {
      return { transaction: copy(transaction), changed: false };
    }
    if (transaction.status !== "pending_payment") {
      throw new InvalidTransactionStateError(
        transaction.status,
        input.outcome === "paid" ? "paid" : "failed",
      );
    }
    const nextPaymentStatus = input.outcome === "paid" ? "paid" : "failed";
    assertValidPaymentTransition(transaction.paymentStatus, nextPaymentStatus);
    const timestamp = new Date().toISOString();
    transaction.paymentStatus = nextPaymentStatus;
    transaction.paymentAttemptKey = input.idempotencyKey;
    transaction.paymentProvider = input.provider;
    transaction.paymentFailureCode = input.failureCode;
    transaction.updatedAt = timestamp;
    transaction.version += 1;
    if (input.outcome === "paid") {
      transaction.status = "paid";
      transaction.paidAt = timestamp;
    } else {
      transaction.paymentFailedAt = timestamp;
    }
    return { transaction: copy(transaction), changed: true };
  }

  async setPaymentProviderReference(
    id: string,
    provider: string,
    providerReference: string,
  ): Promise<Transaction | undefined> {
    const transaction = this.transactions.find((item) => item.id === id);
    if (!transaction) return undefined;
    if (transaction.paymentProviderReference === providerReference)
      return copy(transaction);
    transaction.paymentProvider = provider;
    transaction.paymentProviderReference = providerReference;
    transaction.updatedAt = new Date().toISOString();
    transaction.version += 1;
    return copy(transaction);
  }
}

const copy = (transaction: Transaction): Transaction => ({ ...transaction });
