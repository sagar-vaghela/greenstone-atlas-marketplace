import type {
  FulfilmentStatus,
  PaymentStatus,
  TransactionStatus,
} from "@atlas/types";

export class InvalidTransactionStateError extends Error {
  readonly currentStatus: TransactionStatus | PaymentStatus | FulfilmentStatus;
  readonly nextStatus: TransactionStatus | PaymentStatus | FulfilmentStatus;

  constructor(
    currentStatus: TransactionStatus | PaymentStatus | FulfilmentStatus,
    nextStatus: TransactionStatus | PaymentStatus | FulfilmentStatus,
  ) {
    super(
      `Invalid transaction transition from ${currentStatus} to ${nextStatus}.`,
    );
    this.name = "InvalidTransactionStateError";
    this.currentStatus = currentStatus;
    this.nextStatus = nextStatus;
  }
}

export const assertValidTransactionTransition = (
  currentStatus: TransactionStatus,
  nextStatus: TransactionStatus,
): void => {
  const allowed: Record<string, TransactionStatus[]> = {
    pending_payment: ["paid", "cancelled"],
    paid: ["completed", "cancelled", "disputed"],
    completed: [],
    cancelled: [],
    disputed: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new InvalidTransactionStateError(currentStatus, nextStatus);
  }
};

export const assertValidPaymentTransition = (
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): void => {
  const allowed: Record<string, PaymentStatus[]> = {
    pending: ["paid", "failed"],
    paid: ["refunded"],
    failed: ["pending"],
    refunded: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new InvalidTransactionStateError(currentStatus, nextStatus);
  }
};

export const assertValidFulfilmentTransition = (
  currentStatus: FulfilmentStatus,
  nextStatus: FulfilmentStatus,
): void => {
  const allowed: Record<string, FulfilmentStatus[]> = {
    pending: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new InvalidTransactionStateError(currentStatus, nextStatus);
  }
};
