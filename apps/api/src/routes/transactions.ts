import type { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import { InvalidTransactionStateError } from "../domain/transaction-status.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";
import type { PaymentProvider } from "../payments/payment-provider.js";

interface Options {
  transactionRepository: TransactionRepository;
  eventBus: MarketplaceEventBus;
  paymentProvider: PaymentProvider;
}

interface IdParams {
  id: string;
}

interface PaymentBody {
  outcome?: "success" | "failure";
}

const error = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.status(status).send({ error: { code, message } });

export const registerTransactionRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.get<{ Params: IdParams }>('/transactions/:id', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
      return error(
        reply,
        403,
        'FORBIDDEN',
        'You do not have access to this transaction.',
      );
    }

    return transaction;
  });

  app.get('/me/transactions', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transactions = await options.transactionRepository.findForUser(user.id);
    return { items: transactions };
  });

  app.post<{ Params: IdParams; Body: PaymentBody }>('/transactions/:id/payment', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only the buyer can submit payment.');
    }
    const idempotencyKeyHeader = request.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(idempotencyKeyHeader)
      ? idempotencyKeyHeader[0]
      : idempotencyKeyHeader ?? `legacy:${transaction.id}:${user.id}`;
    const outcome = request.body?.outcome ?? "success";
    if (outcome !== "success" && outcome !== "failure") {
      return error(reply, 400, "INVALID_PAYMENT_REQUEST", "Payment outcome must be success or failure.");
    }

    if (transaction.paymentAttemptKey === idempotencyKey) return transaction;
    if (transaction.status !== 'pending_payment' || !['pending', 'failed'].includes(transaction.paymentStatus)) {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'Payment is not currently pending for this transaction.');
    }

    try {
      const providerResult = await options.paymentProvider.charge({
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        idempotencyKey,
        demoOutcome: outcome,
      });
      const result = await options.transactionRepository.applyPaymentResult(transaction.id, {
        idempotencyKey,
        provider: providerResult.provider,
        outcome: providerResult.outcome,
        failureCode: providerResult.failureCode,
      });
      if (result?.changed) {
        const finalTransaction = result.transaction;
        options.eventBus.publish(
          {
            type: 'transaction.payment_updated',
            listingId: finalTransaction.listingId,
            offerId: finalTransaction.offerId,
            actorUserId: user.id,
            version: finalTransaction.version,
            payload: { transaction: finalTransaction },
          },
          [finalTransaction.buyerId, finalTransaction.sellerId],
        );
      }
      return result?.transaction;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });

  app.post<{ Params: IdParams }>('/transactions/:id/ship', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.sellerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only the seller can ship this transaction.');
    }
    if (
      transaction.status !== 'paid' ||
      transaction.paymentStatus !== 'paid' ||
      transaction.fulfilmentStatus !== 'pending'
    ) {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be shipped yet.');
    }

    try {
      const updatedFulfilment = await options.transactionRepository.updateFulfilmentStatus(
        transaction.id,
        'shipped',
      );
      if (updatedFulfilment) {
        options.eventBus.publish(
          {
            type: 'transaction.fulfilment_updated',
            listingId: updatedFulfilment.listingId,
            offerId: updatedFulfilment.offerId,
            actorUserId: user.id,
            payload: { transaction: updatedFulfilment },
          },
          [updatedFulfilment.buyerId, updatedFulfilment.sellerId],
        );
      }
      return updatedFulfilment;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });

  app.post<{ Params: IdParams }>('/transactions/:id/deliver', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only the buyer can confirm delivery.');
    }
    if (
      transaction.status !== 'paid' ||
      transaction.paymentStatus !== 'paid' ||
      transaction.fulfilmentStatus !== 'shipped'
    ) {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be delivered yet.');
    }

    try {
      const updatedFulfilment = await options.transactionRepository.updateFulfilmentStatus(
        transaction.id,
        'delivered',
      );
      if (updatedFulfilment) {
        options.eventBus.publish(
          {
            type: 'transaction.fulfilment_updated',
            listingId: updatedFulfilment.listingId,
            offerId: updatedFulfilment.offerId,
            actorUserId: user.id,
            payload: { transaction: updatedFulfilment },
          },
          [updatedFulfilment.buyerId, updatedFulfilment.sellerId],
        );
      }
      return updatedFulfilment;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });

  app.post<{ Params: IdParams }>('/transactions/:id/complete', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only the buyer can complete this transaction.');
    }
    if (
      transaction.status !== 'paid' ||
      transaction.paymentStatus !== 'paid' ||
      transaction.fulfilmentStatus !== 'delivered'
    ) {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be completed yet.');
    }

    try {
      const updated = await options.transactionRepository.updateStatus(
        transaction.id,
        'completed',
      );
      if (updated) {
        options.eventBus.publish(
          {
            type: 'transaction.completed',
            listingId: updated.listingId,
            offerId: updated.offerId,
            actorUserId: user.id,
            payload: { transaction: updated },
          },
          [updated.buyerId, updated.sellerId],
        );
      }
      return updated;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });

  app.post<{ Params: IdParams }>('/transactions/:id/cancel', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only a participant can cancel this transaction.');
    }
    if (transaction.status !== 'pending_payment') {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be cancelled at this stage.');
    }

    try {
      const updated = await options.transactionRepository.updateStatus(
        transaction.id,
        'cancelled',
      );
      if (updated) {
        options.eventBus.publish(
          {
            type: 'transaction.cancelled',
            listingId: updated.listingId,
            offerId: updated.offerId,
            actorUserId: user.id,
            payload: { transaction: updated },
          },
          [updated.buyerId, updated.sellerId],
        );
        return updated;
      }
      return updated;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });

  app.post<{ Params: IdParams }>('/transactions/:id/dispute', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id && transaction.sellerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only a participant can open a dispute.');
    }
    if (transaction.status !== 'paid') {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be disputed in its current state.');
    }

    try {
      const updated = await options.transactionRepository.updateStatus(
        transaction.id,
        'disputed',
      );
      if (updated) {
        options.eventBus.publish(
          {
            type: 'transaction.disputed',
            listingId: updated.listingId,
            offerId: updated.offerId,
            actorUserId: user.id,
            payload: { transaction: updated },
          },
          [updated.buyerId, updated.sellerId],
        );
      }
      return updated;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  });
};
