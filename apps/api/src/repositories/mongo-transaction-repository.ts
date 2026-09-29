import { randomUUID } from "node:crypto";
import type {
  CreateTransactionInput,
  FulfilmentStatus,
  PaymentStatus,
  Transaction,
  TransactionStatus,
} from "@atlas/types";
import type { Collection, ObjectId } from "mongodb";
import { assertValidTransactionTransition } from "../domain/transaction-status.js";
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
      { id, status: currentDocument.status },
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

    return nextDocument ? toTransaction(nextDocument) : undefined;
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Transaction | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;

    const document = await this.collection.findOneAndUpdate(
      { id },
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

    return document ? toTransaction(document) : undefined;
  }

  async updateFulfilmentStatus(
    id: string,
    fulfilmentStatus: FulfilmentStatus,
  ): Promise<Transaction | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) return undefined;

    const document = await this.collection.findOneAndUpdate(
      { id },
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

    return document ? toTransaction(document) : undefined;
  }
}
