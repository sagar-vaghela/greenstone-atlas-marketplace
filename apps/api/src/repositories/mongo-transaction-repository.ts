import { randomUUID } from "node:crypto";
import type {
  CreateTransactionInput,
  FulfilmentStatus,
  PaymentStatus,
  Transaction,
  TransactionStatus,
} from "@atlas/types";
import type { Collection, ObjectId } from "mongodb";
import {
  assertValidFulfilmentTransition,
  assertValidPaymentTransition,
  assertValidTransactionTransition,
  InvalidTransactionStateError,
} from "../domain/transaction-status.js";
import type { TransactionRepository } from "./transaction-repository.js";

interface TransactionDocument extends Transaction {
  _id?: ObjectId;
}

const toTransaction = (document: TransactionDocument): Transaction => {
  const { _id: _ignoredId, ...transaction } = document;
  return {
    ...transaction,
    version: transaction.version ?? 1,
  };
};

export class MongoTransactionRepository implements TransactionRepository {
  constructor(private readonly collection: Collection<TransactionDocument>) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const timestamp = new Date().toISOString();
    const transaction: TransactionDocument = {
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

    await this.collection.insertOne(transaction);
    return toTransaction(transaction);
  }

  async findById(id: string): Promise<Transaction | undefined> {
    const document = await this.collection.findOne({ id }, { projection: { _id: 0 } });
    return document ? toTransaction(document) : undefined;
  }

  async findByOfferId(offerId: string): Promise<Transaction | undefined> {
    const document = await this.collection.findOne(
      { offerId },
      { projection: { _id: 0 } },
    );
    return document ? toTransaction(document) : undefined;
  }

  async findByListingId(listingId: string): Promise<Transaction | undefined> {
    const document = await this.collection.findOne(
      { listingId },
      { projection: { _id: 0 } },
    );
    return document ? toTransaction(document) : undefined;
  }

  async findForUser(userId: string): Promise<Transaction[]> {
    const documents = await this.collection
      .find({ $or: [{ buyerId: userId }, { sellerId: userId }] }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();
    return documents.map(toTransaction);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;

    assertValidTransactionTransition(currentDocument.status, status);
    const nextDocument = await this.collection.findOneAndUpdate(
      { id, version: currentDocument.version ?? 1 },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString(),
          version: (currentDocument.version ?? 1) + 1,
          ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
          ...(status === "cancelled" ? { cancelledAt: new Date().toISOString() } : {}),
        },
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    if (!nextDocument) {
      throw new InvalidTransactionStateError(currentDocument.status, status);
    }

    return toTransaction(nextDocument);
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Transaction | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;

    assertValidPaymentTransition(currentDocument.paymentStatus, paymentStatus);
    if (paymentStatus === "paid" && currentDocument.status !== "pending_payment") {
      throw new InvalidTransactionStateError(currentDocument.status, paymentStatus);
    }
    if (paymentStatus === "refunded" && currentDocument.status !== "cancelled") {
      throw new InvalidTransactionStateError(currentDocument.status, paymentStatus);
    }

    const document = await this.collection.findOneAndUpdate(
      { id, version: currentDocument.version ?? 1, paymentStatus: currentDocument.paymentStatus },
      {
        $set: {
          paymentStatus,
          updatedAt: new Date().toISOString(),
          version: (currentDocument.version ?? 1) + 1,
        },
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    if (!document) {
      throw new InvalidTransactionStateError(currentDocument.status, paymentStatus);
    }

    return toTransaction(document);
  }

  async updateFulfilmentStatus(
    id: string,
    fulfilmentStatus: FulfilmentStatus,
  ): Promise<Transaction | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;

    assertValidFulfilmentTransition(currentDocument.fulfilmentStatus, fulfilmentStatus);
    if (
      fulfilmentStatus === "shipped" &&
      !(currentDocument.status === "paid" &&
        currentDocument.paymentStatus === "paid" &&
        currentDocument.fulfilmentStatus === "pending")
    ) {
      throw new InvalidTransactionStateError(currentDocument.status, fulfilmentStatus);
    }
    if (
      fulfilmentStatus === "delivered" &&
      !(currentDocument.status === "paid" &&
        currentDocument.paymentStatus === "paid" &&
        currentDocument.fulfilmentStatus === "shipped")
    ) {
      throw new InvalidTransactionStateError(currentDocument.status, fulfilmentStatus);
    }

    const document = await this.collection.findOneAndUpdate(
      { id, version: currentDocument.version ?? 1, fulfilmentStatus: currentDocument.fulfilmentStatus },
      {
        $set: {
          fulfilmentStatus,
          updatedAt: new Date().toISOString(),
          version: (currentDocument.version ?? 1) + 1,
        },
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    if (!document) {
      throw new InvalidTransactionStateError(currentDocument.status, fulfilmentStatus);
    }

    return toTransaction(document);
  }

  async applyPaymentResult(
    id: string,
    input: { idempotencyKey: string; provider: string; outcome: "paid" | "failed"; failureCode?: string },
  ): Promise<{ transaction: Transaction; changed: boolean } | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;
    if (currentDocument.paymentAttemptKey === input.idempotencyKey) {
      return { transaction: toTransaction(currentDocument), changed: false };
    }
    if (currentDocument.status !== "pending_payment") {
      throw new InvalidTransactionStateError(currentDocument.status, input.outcome === "paid" ? "paid" : "failed");
    }
    const nextPaymentStatus = input.outcome === "paid" ? "paid" : "failed";
    assertValidPaymentTransition(currentDocument.paymentStatus, nextPaymentStatus);
    const timestamp = new Date().toISOString();
    const document = await this.collection.findOneAndUpdate(
      {
        id,
        version: currentDocument.version ?? 1,
        ...(currentDocument.paymentAttemptKey
          ? { paymentAttemptKey: currentDocument.paymentAttemptKey }
          : { paymentAttemptKey: { $exists: false } }),
      },
      {
        $set: {
          paymentStatus: nextPaymentStatus,
          ...(input.outcome === "paid" ? { status: "paid", paidAt: timestamp } : { paymentFailedAt: timestamp }),
          paymentAttemptKey: input.idempotencyKey,
          paymentProvider: input.provider,
          ...(input.failureCode ? { paymentFailureCode: input.failureCode } : {}),
          updatedAt: timestamp,
          version: (currentDocument.version ?? 1) + 1,
        },
      },
      { projection: { _id: 0 }, returnDocument: "after" },
    );
    if (!document) {
      const latest = await this.findById(id);
      if (latest?.paymentAttemptKey === input.idempotencyKey) return { transaction: latest, changed: false };
      throw new InvalidTransactionStateError(currentDocument.status, nextPaymentStatus);
    }
    return { transaction: toTransaction(document), changed: true };
  }
}
