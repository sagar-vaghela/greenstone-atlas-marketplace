export type ListingStatus = "draft" | "active" | "sold";
export type ListingSaleMode = "fixed_price" | "auction";

export type UserRole = "buyer" | "seller";

export type SellerVerificationStatus = "unverified" | "pending" | "verified";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProfile {
  userId: string;
  bio?: string;
  location?: string;
  memberSince: string;
  verificationStatus: SellerVerificationStatus;
  responseRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerPublicUser {
  id: string;
  displayName: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  offerId?: string;
  transactionId?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface ConversationSummary extends Conversation {
  listing: Pick<Listing, "id" | "title" | "images">;
  otherParticipant: SellerPublicUser;
  unreadCount: number;
}

export interface CreateConversationInput {
  listingId: string;
}

export interface SellerProfileResponse {
  user: SellerPublicUser;
  profile: Omit<SellerProfile, "userId" | "createdAt" | "updatedAt">;
  stats: {
    activeListings: number;
    soldListings: number;
  };
}

export interface UpdateSellerProfileInput {
  displayName?: string;
  bio?: string;
  location?: string;
}

export type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export type TransactionStatus =
  | "pending_payment"
  | "paid"
  | "completed"
  | "cancelled"
  | "disputed";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type FulfilmentStatus = "pending" | "shipped" | "delivered";

export type ListingSort = "newest" | "oldest" | "price_asc" | "price_desc";

export interface ListingImage {
  url: string;
  alt?: string;
}

export interface ListingQuery {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  brand?: string;
  model?: string;
  referenceNumber?: string;
  description: string;
  condition?: string;
  year?: number;
  location?: string;
  price: number;
  currency: string;
  category: string;
  images: ListingImage[];
  status: ListingStatus;
  saleMode?: ListingSaleMode;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type AuctionStatus = "scheduled" | "active" | "ended" | "cancelled";
export type BidStatus = "active" | "outbid" | "winning" | "withdrawn" | "accepted";

export interface Auction {
  id: string;
  listingId: string;
  sellerId: string;
  startsAt: string;
  endsAt: string;
  status: AuctionStatus;
  startingPrice: number;
  reservePrice?: number;
  minimumBidIncrement: number;
  highestBidId?: string;
  version: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  listingId: string;
  bidderId: string;
  amount: number;
  currency: string;
  status: BidStatus;
  createdAt: string;
  version: number;
}

export interface CreateAuctionInput {
  listingId: string;
  sellerId: string;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  reservePrice?: number;
  minimumBidIncrement: number;
}

export interface PlaceBidInput {
  auctionId: string;
  listingId: string;
  bidderId: string;
  amount: number;
  currency: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: OfferStatus;
  parentOfferId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type MarketplaceEventType =
  | "auction.created"
  | "auction.updated"
  | "bid.placed"
  | "offer.created"
  | "offer.countered"
  | "offer.accepted"
  | "offer.rejected"
  | "offer.withdrawn"
  | "listing.status_changed"
  | "transaction.created"
  | "transaction.payment_updated"
  | "transaction.fulfilment_updated"
  | "transaction.completed"
  | "transaction.cancelled"
  | "transaction.disputed"
  | "message.created"
  | "conversation.read"
  | "conversation.typing"
  | "notification.created";

export type NotificationType =
  | "offer_received"
  | "offer_countered"
  | "offer_accepted"
  | "offer_rejected"
  | "offer_withdrawn"
  | "message_received"
  | "payment_required"
  | "payment_received"
  | "payment_failed"
  | "shipment_created"
  | "delivery_confirmed"
  | "transaction_completed"
  | "listing_sold";

export type NotificationResourceType =
  | "listing"
  | "offer"
  | "transaction"
  | "conversation";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceType: NotificationResourceType;
  resourceId: string;
  sourceEventId: string;
  readAt?: string;
  createdAt: string;
}

export type MarketplaceEventPayload =
  | { offer: Offer }
  | { auction: Auction }
  | { bid: Bid }
  | { listing: Listing }
  | { transaction: Transaction }
  | { message: Message }
  | { notification: Notification }
  | { conversationId: string; readAt: string }
  | { conversationId: string; isTyping: boolean };

export interface MarketplaceEvent {
  id: string;
  type: MarketplaceEventType;
  timestamp: string;
  listingId: string;
  offerId?: string;
  actorUserId?: string;
  recipientUserId?: string;
  version?: number;
  payload: MarketplaceEventPayload;
}

export interface CreateOfferInput {
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  parentOfferId?: string;
}

export interface CreateListingInput {
  title: string;
  brand?: string;
  model?: string;
  referenceNumber?: string;
  description: string;
  condition?: string;
  year?: number;
  location?: string;
  price: number;
  currency: string;
  category: string;
  images: ListingImage[];
  saleMode?: ListingSaleMode;
}

export interface CreateListingRepositoryInput extends CreateListingInput {
  sellerId: string;
}

export interface Transaction {
  id: string;
  listingId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  version: number;
  paymentAttemptKey?: string;
  paymentProvider?: string;
  paymentProviderReference?: string;
  paymentFailureCode?: string;
  paidAt?: string;
  paymentFailedAt?: string;
  dispute?: TransactionDispute;
}

export type DisputeReason =
  | "item_not_received"
  | "item_not_as_described"
  | "suspected_counterfeit"
  | "payment_or_refund"
  | "other";

export interface TransactionDispute {
  caseReference: string;
  reason: DisputeReason;
  description: string;
  openedBy: string;
  openedAt: string;
}

export interface CreateTransactionInput {
  listingId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  images?: ListingImage[];
}
