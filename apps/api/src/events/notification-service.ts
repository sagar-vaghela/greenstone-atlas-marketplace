import type { Listing, MarketplaceEvent, Notification, Offer, Transaction } from "@atlas/types";
import type { NotificationRepository } from "../repositories/notification-repository.js";
import { MarketplaceEventBus } from "./marketplace-event-bus.js";

type NotificationDraft = Omit<Notification, "id" | "userId" | "sourceEventId">;

const draftFor = (event: MarketplaceEvent): { userId: string; draft: NotificationDraft }[] => {
  switch (event.type) {
    case "offer.created": { const offer = (event.payload as { offer: Offer }).offer; return [{ userId: offer.sellerId, draft: { type: "offer_received", title: "New offer received", body: "A buyer submitted an offer on your listing.", resourceType: "offer", resourceId: offer.id, createdAt: event.timestamp } }]; }
    case "offer.countered": { const offer = (event.payload as { offer: Offer }).offer; return [{ userId: offer.buyerId, draft: { type: "offer_countered", title: "Counter-offer received", body: "The seller sent you a counter-offer.", resourceType: "offer", resourceId: offer.id, createdAt: event.timestamp } }]; }
    case "offer.accepted": { const offer = (event.payload as { offer: Offer }).offer; return [{ userId: offer.buyerId, draft: { type: "offer_accepted", title: "Offer accepted", body: "Your offer was accepted.", resourceType: "offer", resourceId: offer.id, createdAt: event.timestamp } }]; }
    case "offer.rejected": { const offer = (event.payload as { offer: Offer }).offer; return [{ userId: offer.buyerId, draft: { type: "offer_rejected", title: "Offer declined", body: "Your offer is no longer available.", resourceType: "offer", resourceId: offer.id, createdAt: event.timestamp } }]; }
    case "offer.withdrawn": { const offer = (event.payload as { offer: Offer }).offer; return [{ userId: offer.sellerId, draft: { type: "offer_withdrawn", title: "Offer withdrawn", body: "A buyer withdrew an offer on your listing.", resourceType: "offer", resourceId: offer.id, createdAt: event.timestamp } }]; }
    case "transaction.created": { const transaction = (event.payload as { transaction: Transaction }).transaction; return [{ userId: transaction.buyerId, draft: { type: "payment_required", title: "Payment required", body: "Complete payment for your purchase.", resourceType: "transaction", resourceId: transaction.id, createdAt: event.timestamp } }]; }
    case "transaction.payment_updated": { const transaction = (event.payload as { transaction: Transaction }).transaction; return transaction.paymentStatus === "paid" ? [{ userId: transaction.sellerId, draft: { type: "payment_received", title: "Payment received", body: "Payment was received for your sale.", resourceType: "transaction", resourceId: transaction.id, createdAt: event.timestamp } }] : transaction.paymentStatus === "failed" ? [{ userId: transaction.buyerId, draft: { type: "payment_failed", title: "Payment failed", body: "Your payment was declined. You can retry this payment.", resourceType: "transaction", resourceId: transaction.id, createdAt: event.timestamp } }] : []; }
    case "transaction.fulfilment_updated": { const transaction = (event.payload as { transaction: Transaction }).transaction; if (transaction.fulfilmentStatus === "shipped") return [{ userId: transaction.buyerId, draft: { type: "shipment_created", title: "Item shipped", body: "Your seller marked the item as shipped.", resourceType: "transaction", resourceId: transaction.id, createdAt: event.timestamp } }]; if (transaction.fulfilmentStatus === "delivered") return [{ userId: transaction.sellerId, draft: { type: "delivery_confirmed", title: "Delivery confirmed", body: "The buyer confirmed delivery.", resourceType: "transaction", resourceId: transaction.id, createdAt: event.timestamp } }]; return []; }
    case "transaction.completed": { const transaction = (event.payload as { transaction: Transaction }).transaction; return [transaction.buyerId, transaction.sellerId].map((userId) => ({ userId, draft: { type: "transaction_completed" as const, title: "Transaction completed", body: "Your transaction is complete.", resourceType: "transaction" as const, resourceId: transaction.id, createdAt: event.timestamp } })); }
    case "listing.status_changed": { const listing = (event.payload as { listing: Listing }).listing; return listing.status === "sold" ? [{ userId: listing.sellerId, draft: { type: "listing_sold", title: "Listing sold", body: "Your listing was marked as sold.", resourceType: "listing", resourceId: listing.id, createdAt: event.timestamp } }] : []; }
    default:
      return [];
  }
};

export class NotificationService {
  private readonly unsubscribe: () => void;
  constructor(private readonly repository: NotificationRepository, private readonly eventBus: MarketplaceEventBus) {
    this.unsubscribe = eventBus.subscribeAll((event) => {
      void this.handle(event);
    });
  }

  private async handle(event: MarketplaceEvent): Promise<void> {
    if (event.type === "notification.created") return;
    for (const item of draftFor(event)) {
      const notification = await this.repository.create({ ...item.draft, userId: item.userId, sourceEventId: event.id });
      if (notification) {
        this.eventBus.publish({ type: "notification.created", listingId: event.listingId, offerId: event.offerId, actorUserId: event.actorUserId, recipientUserId: notification.userId, payload: { notification } }, [notification.userId]);
      }
    }
  }

  close(): void { this.unsubscribe(); }
}
