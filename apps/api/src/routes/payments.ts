import type { FastifyInstance } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import { InvalidTransactionStateError } from "../domain/transaction-status.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import type { PaymentProvider } from "../payments/payment-provider.js";
import type { TransactionRepository } from "../repositories/transaction-repository.js";

interface Options {
  transactionRepository: TransactionRepository;
  paymentProvider: PaymentProvider;
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

const publishPaymentUpdate = (
  eventBus: MarketplaceEventBus,
  transaction: Awaited<ReturnType<TransactionRepository["findById"]>>,
) => {
  if (!transaction) return;
  eventBus.publish(
    {
      type: "transaction.payment_updated",
      listingId: transaction.listingId,
      offerId: transaction.offerId,
      actorUserId: transaction.buyerId,
      version: transaction.version,
      payload: { transaction },
    },
    [transaction.buyerId, transaction.sellerId],
  );
};

export const registerPaymentRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.post<{ Params: IdParams }>(
    "/transactions/:id/payment-intent",
    async (request, reply) => {
      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const transaction = await options.transactionRepository.findById(
        request.params.id,
      );
      if (!transaction)
        return error(
          reply,
          404,
          "TRANSACTION_NOT_FOUND",
          "Transaction not found",
        );
      if (transaction.buyerId !== user.id)
        return error(
          reply,
          403,
          "FORBIDDEN",
          "Only the buyer can pay for this transaction.",
        );
      if (
        transaction.status !== "pending_payment" ||
        !["pending", "failed"].includes(transaction.paymentStatus)
      ) {
        return error(
          reply,
          409,
          "PAYMENT_NOT_ALLOWED",
          "Payment is not currently available for this transaction.",
        );
      }

      const header = request.headers["idempotency-key"];
      const idempotencyKey =
        (Array.isArray(header) ? header[0] : header) ??
        `atlas:${transaction.id}`;
      let intent;
      try {
        intent = transaction.paymentProviderReference
          ? await options.paymentProvider.retrievePaymentIntent(
              transaction.paymentProviderReference,
            )
          : await options.paymentProvider.createPaymentIntent({
              transactionId: transaction.id,
              amount: transaction.amount,
              currency: transaction.currency,
              idempotencyKey,
            });
      } catch {
        request.log.warn(
          { transactionId: transaction.id },
          "Payment provider request failed",
        );
        return error(
          reply,
          502,
          "PAYMENT_PROVIDER_ERROR",
          "The payment provider could not prepare this payment.",
        );
      }
      const saved = transaction.paymentProviderReference
        ? transaction
        : await options.transactionRepository.setPaymentProviderReference(
            transaction.id,
            intent.provider,
            intent.providerReference,
          );
      request.log.info(
        {
          transactionId: transaction.id,
          stripePaymentIntentId: intent.providerReference,
          reused: Boolean(transaction.paymentProviderReference),
        },
        transaction.paymentProviderReference
          ? "Payment intent reused"
          : "Payment intent created",
      );
      return {
        transactionId: transaction.id,
        provider: intent.provider,
        paymentIntentId: intent.providerReference,
        clientSecret: intent.clientSecret,
        status: intent.status,
        transaction: saved,
      };
    },
  );

  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );
  app.post("/webhooks/stripe", async (request, reply) => {
    if (!options.paymentProvider.parseWebhookEvent)
      return error(
        reply,
        503,
        "PAYMENT_PROVIDER_UNAVAILABLE",
        "Stripe webhooks are not configured.",
      );
    const signatureHeader = request.headers["stripe-signature"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!signature || !Buffer.isBuffer(request.body))
      return error(
        reply,
        400,
        "INVALID_WEBHOOK",
        "Invalid Stripe webhook request.",
      );

    let event;
    try {
      event = options.paymentProvider.parseWebhookEvent(
        request.body,
        signature,
      );
    } catch {
      request.log.warn("Stripe webhook rejected");
      return error(
        reply,
        400,
        "INVALID_WEBHOOK_SIGNATURE",
        "Invalid Stripe webhook signature.",
      );
    }
    if (!event) {
      request.log.info("Stripe webhook ignored");
      return { received: true, ignored: true };
    }

    const transaction =
      await options.transactionRepository.findByPaymentProviderReference(
        event.providerReference,
      );
    if (!transaction)
      return error(
        reply,
        404,
        "TRANSACTION_NOT_FOUND",
        "Transaction for payment event not found.",
      );
    let result;
    try {
      result = await options.transactionRepository.applyPaymentResult(
        transaction.id,
        {
          idempotencyKey: `stripe:event:${event.id}`,
          provider: "stripe",
          outcome: event.type === "payment_succeeded" ? "paid" : "failed",
          failureCode: event.failureCode,
        },
      );
    } catch (caught) {
      if (caught instanceof InvalidTransactionStateError) {
        request.log.warn(
          { transactionId: transaction.id, stripeEventId: event.id },
          "Payment reconciliation conflict",
        );
        return error(
          reply,
          409,
          "PAYMENT_CONFLICT",
          "Payment reconciliation conflicted with the current transaction state.",
        );
      }
      throw caught;
    }
    if (result?.changed)
      publishPaymentUpdate(options.eventBus, result.transaction);
    request.log.info(
      {
        transactionId: transaction.id,
        stripePaymentIntentId: event.providerReference,
        stripeEventId: event.id,
        outcome: event.type,
        duplicate: !result?.changed,
      },
      !result?.changed ? "Stripe webhook duplicate" : "Payment reconciled",
    );
    return { received: true, duplicate: !result?.changed };
  });
};
