import type { TransactionStatus } from "@atlas/types";

export class InvalidTransactionStateError extends Error {
  readonly currentStatus: TransactionStatus;
  readonly nextStatus: TransactionStatus;

  constructor(currentStatus: TransactionStatus, nextStatus: TransactionStatus) {
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
  const allowed: Record<TransactionStatus, TransactionStatus[]> = {
    pending_payment: ["paid", "cancelled"],
    paid: ["fulfilment_pending", "disputed"],
    fulfilment_pending: ["shipped", "disputed"],
    shipped: ["delivered", "disputed"],
    delivered: ["completed", "disputed"],
    completed: [],
    cancelled: [],
    disputed: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new InvalidTransactionStateError(currentStatus, nextStatus);
  }
};
