import type {
  Listing,
  Message,
  Notification,
  Offer,
  SellerProfile,
  Transaction,
  UserRole,
} from "@atlas/types";
import type { ConversationRecord } from "./repositories/conversation-repository.js";

const timestamp = "2026-10-01T12:00:00.000Z";
const olderTimestamp = "2026-09-30T12:00:00.000Z";
export const qaTestPassword = "QaTest123!";

export const qaUsers: Array<{
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}> = [
  {
    id: "qa-seller-primary",
    email: "seller.one@atlas-marketplace.test",
    displayName: "QA Seller One",
    role: "seller",
    password: qaTestPassword,
  },
  {
    id: "qa-seller-secondary",
    email: "seller.two@atlas-marketplace.test",
    displayName: "QA Seller Two",
    role: "seller",
    password: qaTestPassword,
  },
  {
    id: "qa-buyer-primary",
    email: "buyer.one@atlas-marketplace.test",
    displayName: "QA Buyer One",
    role: "buyer",
    password: qaTestPassword,
  },
  {
    id: "qa-buyer-secondary",
    email: "buyer.two@atlas-marketplace.test",
    displayName: "QA Buyer Two",
    role: "buyer",
    password: qaTestPassword,
  },
  {
    id: "qa-buyer-outsider",
    email: "buyer.outsider@atlas-marketplace.test",
    displayName: "QA Buyer Outsider",
    role: "buyer",
    password: qaTestPassword,
  },
];

export const qaSellerProfiles: Array<
  Pick<
    SellerProfile,
    | "userId"
    | "bio"
    | "location"
    | "memberSince"
    | "verificationStatus"
    | "responseRate"
  >
> = [
  {
    userId: "qa-seller-primary",
    bio: "QA profile for verified seller flows and seller-side marketplace actions.",
    location: "Dubai, UAE",
    memberSince: "2024-01-15T00:00:00.000Z",
    verificationStatus: "verified",
    responseRate: 96,
  },
  {
    userId: "qa-seller-secondary",
    bio: "QA profile for pending verification and second-seller ownership checks.",
    location: "Abu Dhabi, UAE",
    memberSince: "2025-06-01T00:00:00.000Z",
    verificationStatus: "pending",
    responseRate: 80,
  },
];

const image = (id: string, alt: string) => ({
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`,
  alt,
});

const transactionListingSeeds = [
  ["payment-pending", "Awaiting payment", "qa-seller-primary"],
  ["payment-retry", "Payment retry", "qa-seller-secondary"],
  ["ready-to-ship", "Ready to ship", "qa-seller-primary"],
  ["in-transit", "In transit", "qa-seller-secondary"],
  ["ready-to-complete", "Ready to complete", "qa-seller-primary"],
  ["completed", "Completed purchase", "qa-seller-secondary"],
  ["cancelled", "Cancelled purchase", "qa-seller-primary"],
  ["disputed", "Disputed purchase", "qa-seller-secondary"],
] as const;

export const qaListings: Listing[] = [
  {
    id: "qa-listing-active-negotiation",
    sellerId: "qa-seller-primary",
    title: "QA | Active listing with offers",
    brand: "Atlas",
    model: "Negotiation Fixture",
    referenceNumber: "QA-ACTIVE-001",
    description:
      "QA fixture for buyer offers, seller counter-offers, private offer visibility, and messaging.",
    condition: "Excellent",
    year: 2024,
    location: "Dubai, UAE",
    price: 24000,
    currency: "AED",
    category: "luxury-watches",
    images: [image("photo-1523170335258-f5ed11844a49", "QA active watch")],
    status: "active",
    createdAt: olderTimestamp,
    updatedAt: olderTimestamp,
    version: 1,
  },
  {
    id: "qa-listing-active-clean",
    sellerId: "qa-seller-secondary",
    title: "QA | Active listing without offers",
    brand: "Atlas",
    model: "Clean Fixture",
    referenceNumber: "QA-ACTIVE-002",
    description:
      "QA fixture for first-time messaging, new offers, and another seller's active listing.",
    condition: "Very good",
    year: 2022,
    location: "Abu Dhabi, UAE",
    price: 18000,
    currency: "AED",
    category: "luxury-watches",
    images: [image("photo-1547996160-81dfa63595aa", "QA clean watch")],
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  },
  {
    id: "qa-listing-draft",
    sellerId: "qa-seller-primary",
    title: "QA | Draft listing to publish",
    brand: "Atlas",
    model: "Draft Fixture",
    referenceNumber: "QA-DRAFT-001",
    description:
      "QA fixture for draft visibility, editing, and activating a listing.",
    condition: "Good",
    year: 2019,
    location: "Sharjah, UAE",
    price: 9000,
    currency: "AED",
    category: "luxury-watches",
    images: [],
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  },
  ...transactionListingSeeds.map(([fixture, label, sellerId], index) => ({
    id: `qa-listing-${fixture}`,
    sellerId,
    title: `QA | ${label}`,
    brand: "Atlas",
    model: `${label} Fixture`,
    referenceNumber: `QA-TXN-${String(index + 1).padStart(3, "0")}`,
    description: `QA fixture for the ${label.toLowerCase()} transaction workflow.`,
    condition: "Excellent",
    year: 2023,
    location: sellerId === "qa-seller-primary" ? "Dubai, UAE" : "Abu Dhabi, UAE",
    price: 30000 + index * 1000,
    currency: "AED",
    category: "luxury-watches",
    images: [image("photo-1508057198894-247b23fe5ade", `QA ${label} watch`)],
    status: "sold" as const,
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    version: 2,
  })),
];

const transactionStates: Array<{
  fixture: string;
  status: Transaction["status"];
  paymentStatus: Transaction["paymentStatus"];
  fulfilmentStatus: Transaction["fulfilmentStatus"];
  version: number;
  failure?: boolean;
}> = [
  { fixture: "payment-pending", status: "pending_payment", paymentStatus: "pending", fulfilmentStatus: "pending", version: 1 },
  { fixture: "payment-retry", status: "pending_payment", paymentStatus: "failed", fulfilmentStatus: "pending", version: 2, failure: true },
  { fixture: "ready-to-ship", status: "paid", paymentStatus: "paid", fulfilmentStatus: "pending", version: 2 },
  { fixture: "in-transit", status: "paid", paymentStatus: "paid", fulfilmentStatus: "shipped", version: 3 },
  { fixture: "ready-to-complete", status: "paid", paymentStatus: "paid", fulfilmentStatus: "delivered", version: 4 },
  { fixture: "completed", status: "completed", paymentStatus: "paid", fulfilmentStatus: "delivered", version: 5 },
  { fixture: "cancelled", status: "cancelled", paymentStatus: "refunded", fulfilmentStatus: "pending", version: 3 },
  { fixture: "disputed", status: "disputed", paymentStatus: "paid", fulfilmentStatus: "delivered", version: 5 },
];

const transactionListing = (fixture: string): Listing => {
  const listing = qaListings.find((item) => item.id === `qa-listing-${fixture}`);
  if (!listing) {
    throw new Error(`QA transaction listing is missing for "${fixture}".`);
  }
  return listing;
};

export const qaOffers: Offer[] = [
  {
    id: "qa-offer-pending",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-secondary",
    sellerId: "qa-seller-primary",
    amount: 22000,
    currency: "AED",
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  },
  {
    id: "qa-offer-countered",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-primary",
    sellerId: "qa-seller-primary",
    amount: 21500,
    currency: "AED",
    status: "countered",
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    version: 2,
  },
  {
    id: "qa-offer-counter-response",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-primary",
    sellerId: "qa-seller-primary",
    amount: 23000,
    currency: "AED",
    status: "pending",
    parentOfferId: "qa-offer-countered",
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  },
  {
    id: "qa-offer-rejected",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-secondary",
    sellerId: "qa-seller-primary",
    amount: 19000,
    currency: "AED",
    status: "rejected",
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    version: 2,
  },
  {
    id: "qa-offer-withdrawn",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-outsider",
    sellerId: "qa-seller-primary",
    amount: 20000,
    currency: "AED",
    status: "withdrawn",
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    version: 2,
  },
  {
    id: "qa-offer-expired",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-outsider",
    sellerId: "qa-seller-primary",
    amount: 20500,
    currency: "AED",
    status: "expired",
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    version: 2,
  },
  ...transactionStates.map((state, index) => {
    const listing = transactionListing(state.fixture);
    return {
      id: `qa-offer-${state.fixture}`,
      listingId: listing.id,
      buyerId: "qa-buyer-primary",
      sellerId: listing.sellerId,
      amount: listing.price - 500,
      currency: "AED",
      status: "accepted" as const,
      createdAt: olderTimestamp,
      updatedAt: timestamp,
      version: index === 0 ? 2 : 3,
    };
  }),
];

export const qaTransactions: Transaction[] = transactionStates.map((state) => {
  const listing = transactionListing(state.fixture);
  return {
    id: `qa-transaction-${state.fixture}`,
    listingId: listing.id,
    offerId: `qa-offer-${state.fixture}`,
    buyerId: "qa-buyer-primary",
    sellerId: listing.sellerId,
    amount: listing.price - 500,
    currency: "AED",
    status: state.status,
    paymentStatus: state.paymentStatus,
    fulfilmentStatus: state.fulfilmentStatus,
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    ...(state.status === "completed" ? { completedAt: timestamp } : {}),
    ...(state.status === "cancelled" ? { cancelledAt: timestamp } : {}),
    ...(state.failure
      ? {
          paymentAttemptKey: "qa-payment-attempt-failed",
          paymentProvider: "demo",
          paymentFailureCode: "demo_declined",
          paymentFailedAt: timestamp,
        }
      : {}),
    ...(state.paymentStatus === "paid" ? { paidAt: olderTimestamp } : {}),
    version: state.version,
  };
});

export const qaConversations: ConversationRecord[] = [
  {
    id: "qa-conversation-buyer-unread",
    listingId: "qa-listing-active-negotiation",
    buyerId: "qa-buyer-primary",
    sellerId: "qa-seller-primary",
    lastMessageAt: timestamp,
    lastMessagePreview: "I have attached the service documents.",
    createdAt: olderTimestamp,
    updatedAt: timestamp,
    buyerLastReadAt: olderTimestamp,
  },
  {
    id: "qa-conversation-buyer-read",
    listingId: "qa-listing-active-clean",
    buyerId: "qa-buyer-secondary",
    sellerId: "qa-seller-secondary",
    lastMessageAt: olderTimestamp,
    lastMessagePreview: "Thank you for the details.",
    createdAt: olderTimestamp,
    updatedAt: olderTimestamp,
    buyerLastReadAt: timestamp,
    sellerLastReadAt: timestamp,
  },
];

export const qaMessages: Message[] = [
  {
    id: "qa-message-unread-1",
    conversationId: "qa-conversation-buyer-unread",
    senderId: "qa-seller-primary",
    body: "Can you share the service history?",
    createdAt: olderTimestamp,
    readAt: olderTimestamp,
  },
  {
    id: "qa-message-unread-2",
    conversationId: "qa-conversation-buyer-unread",
    senderId: "qa-seller-primary",
    body: "The watch was serviced this year and includes the service papers.",
    createdAt: timestamp,
  },
  {
    id: "qa-message-unread-3",
    conversationId: "qa-conversation-buyer-unread",
    senderId: "qa-seller-primary",
    body: "I have attached the service documents.",
    createdAt: timestamp,
  },
  {
    id: "qa-message-read-1",
    conversationId: "qa-conversation-buyer-read",
    senderId: "qa-buyer-secondary",
    body: "Is collection available in Abu Dhabi?",
    createdAt: olderTimestamp,
    readAt: timestamp,
  },
  {
    id: "qa-message-read-2",
    conversationId: "qa-conversation-buyer-read",
    senderId: "qa-seller-secondary",
    body: "Yes, collection can be arranged.",
    createdAt: timestamp,
    readAt: timestamp,
  },
];

export const qaNotifications: Notification[] = [
  {
    id: "qa-notification-unread-offer",
    userId: "qa-seller-primary",
    type: "offer_received",
    title: "QA: New offer received",
    body: "A buyer submitted an offer on the active QA listing.",
    resourceType: "offer",
    resourceId: "qa-offer-pending",
    sourceEventId: "qa-event-offer-pending",
    createdAt: timestamp,
  },
  {
    id: "qa-notification-unread-message",
    userId: "qa-buyer-primary",
    type: "message_received",
    title: "QA: New message",
    body: "There are unread messages in your QA conversation.",
    resourceType: "conversation",
    resourceId: "qa-conversation-buyer-unread",
    sourceEventId: "qa-event-message-unread",
    createdAt: timestamp,
  },
  {
    id: "qa-notification-payment-failed",
    userId: "qa-buyer-primary",
    type: "payment_failed",
    title: "QA: Payment failed",
    body: "Retry payment on the payment retry transaction.",
    resourceType: "transaction",
    resourceId: "qa-transaction-payment-retry",
    sourceEventId: "qa-event-payment-failed",
    createdAt: olderTimestamp,
    readAt: timestamp,
  },
  {
    id: "qa-notification-shipped",
    userId: "qa-buyer-primary",
    type: "shipment_created",
    title: "QA: Item shipped",
    body: "The in-transit fixture is ready for delivery confirmation.",
    resourceType: "transaction",
    resourceId: "qa-transaction-in-transit",
    sourceEventId: "qa-event-shipped",
    createdAt: olderTimestamp,
    readAt: timestamp,
  },
];
