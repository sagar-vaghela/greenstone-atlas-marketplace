import type { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import { InvalidTransactionStateError } from "../domain/transaction-status.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";

interface Options {
  transactionRepository: TransactionRepository;
  eventBus: MarketplaceEventBus;
}

interface IdParams {
  id: string;
}

const error = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.status(status).send({ error: { code, message } });

const publishTransactionUpdate = (
  eventBus: MarketplaceEventBus,
  type: "transaction.created" | "transaction.payment_updated" | "transaction.fulfilment_updated" | "transaction.completed" | "transaction.cancelled" | "transaction.disputed",
  transaction: { id: string; buyerId: string; sellerId: string; listingId: string; offerId: string; },
): void => {
  eventBus.publish(
    {
      type,
      listingId: transaction.listingId,
      offerId: transaction.offerId,
      actorUserId: transaction.buyerId,
      payload: { transaction: transaction as any },
    },
    [transaction.buyerId, transaction.sellerId],
  );
};

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

  const transitionOrError = async (
    reply: any,
    transaction: Awaited<ReturnType<TransactionRepository['findById']>>,
    targetStatus: any,
    unit: 'payment' | 'fulfilment' | 'status',
  ) => {
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== reply.request?.user?.id && transaction.sellerId !== reply.request?.user?.id) {
      return error(reply, 403, 'FORBIDDEN', 'You do not have access to this transaction.');
    }
    try {
      const updated =
        unit === 'status'
          ? await options.transactionRepository.updateStatus(transaction.id, targetStatus)
          : unit === 'payment'
            ? await options.transactionRepository.updatePaymentStatus(transaction.id, targetStatus)
            : await options.transactionRepository.updateFulfilmentStatus(transaction.id, targetStatus);
      return updated;
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        return error(reply, 409, 'INVALID_TRANSACTION_STATE', caught.message);
      }
      throw caught;
    }
  };

  app.post<{ Params: IdParams }>('/transactions/:id/payment', async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    const transaction = await options.transactionRepository.findById(request.params.id);
    if (!transaction) {
      return error(reply, 404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      return error(reply, 403, 'FORBIDDEN', 'Only the buyer can submit payment.');
    }
    if (transaction.status !== 'pending_payment') {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'Payment is no longer pending for this transaction.');
    }
    if (transaction.paymentStatus === 'paid') {
      return error(reply, 409, 'TRANSACTION_ALREADY_PAID', 'Payment has already been recorded.');
    }

    try {
      const updatedStatus = await options.transactionRepository.updateStatus(
        transaction.id,
        'paid',
      );
      const updatedPayment = await options.transactionRepository.updatePaymentStatus(
        transaction.id,
        'paid',
      );
      const finalTransaction = updatedPayment ?? updatedStatus;
      if (finalTransaction) {
        options.eventBus.publish(
          {
            type: 'transaction.payment_updated',
            listingId: finalTransaction.listingId,
            offerId: finalTransaction.offerId,
            actorUserId: user.id,
            payload: { transaction: finalTransaction },
          },
          [finalTransaction.buyerId, finalTransaction.sellerId],
        );
      }
      return finalTransaction;
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
    if (transaction.status !== 'paid' && transaction.status !== 'fulfilment_pending') {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be shipped yet.');
    }

    try {
      const updatedStatus = await options.transactionRepository.updateStatus(
        transaction.id,
        'shipped',
      );
      const updatedFulfilment = await options.transactionRepository.updateFulfilmentStatus(
        transaction.id,
        'shipped',
      );
      const finalTransaction = updatedFulfilment ?? updatedStatus;
      if (finalTransaction) {
        options.eventBus.publish(
          {
            type: 'transaction.fulfilment_updated',
            listingId: finalTransaction.listingId,
            offerId: finalTransaction.offerId,
            actorUserId: user.id,
            payload: { transaction: finalTransaction },
          },
          [finalTransaction.buyerId, finalTransaction.sellerId],
        );
      }
      return finalTransaction;
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
    if (transaction.status !== 'shipped') {
      return error(reply, 409, 'INVALID_TRANSACTION_STATE', 'This transaction cannot be delivered yet.');
    }

    try {
      const updatedStatus = await options.transactionRepository.updateStatus(
        transaction.id,
        'delivered',
      );
      const updatedFulfilment = await options.transactionRepository.updateFulfilmentStatus(
        transaction.id,
        'delivered',
      );
      const finalTransaction = updatedFulfilment ?? updatedStatus;
      if (finalTransaction) {
        options.eventBus.publish(
          {
            type: 'transaction.fulfilment_updated',
            listingId: finalTransaction.listingId,
            offerId: finalTransaction.offerId,
            actorUserId: user.id,
            payload: { transaction: finalTransaction },
          },
          [finalTransaction.buyerId, finalTransaction.sellerId],
        );
      }
      return finalTransaction;
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
    if (transaction.status !== 'delivered') {
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
        const paymentStatus = updated.paymentStatus === 'paid' ? 'refunded' : 'pending';
        const paymentUpdated = await options.transactionRepository.updatePaymentStatus(
          updated.id,
          paymentStatus,
        );
        const finalTransaction = paymentUpdated ?? updated;
        options.eventBus.publish(
          {
            type: 'transaction.cancelled',
            listingId: finalTransaction.listingId,
            offerId: finalTransaction.offerId,
            actorUserId: user.id,
            payload: { transaction: finalTransaction },
          },
          [finalTransaction.buyerId, finalTransaction.sellerId],
        );
        return finalTransaction;
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
    if (
      !['paid', 'fulfilment_pending', 'shipped', 'delivered'].includes(
        transaction.status,
      )
    ) {
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
