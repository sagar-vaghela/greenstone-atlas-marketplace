import type {
  CreateTransactionInput,
  TransactionDispute,
  FulfilmentStatus,
  PaymentStatus,
  Transaction,
  TransactionStatus,
} from "@atlas/types";

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  findById(id: string): Promise<Transaction | undefined>;
  findByPaymentProviderReference(
    providerReference: string,
  ): Promise<Transaction | undefined>;
  findByOfferId(offerId: string): Promise<Transaction | undefined>;
  findByListingId(listingId: string): Promise<Transaction | undefined>;
  findForUser(userId: string): Promise<Transaction[]>;
  updateStatus(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction | undefined>;
  openDispute(
    id: string,
    dispute: TransactionDispute,
  ): Promise<Transaction | undefined>;
  updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Transaction | undefined>;
  updateFulfilmentStatus(
    id: string,
    fulfilmentStatus: FulfilmentStatus,
  ): Promise<Transaction | undefined>;
  applyPaymentResult(
    id: string,
    input: {
      idempotencyKey: string;
      provider: string;
      outcome: "paid" | "failed";
      failureCode?: string;
    },
  ): Promise<{ transaction: Transaction; changed: boolean } | undefined>;
  setPaymentProviderReference(
    id: string,
    provider: string,
    providerReference: string,
  ): Promise<Transaction | undefined>;
}
