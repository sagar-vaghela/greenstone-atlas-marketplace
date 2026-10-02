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

const demoTimestamp = "2026-10-01T12:00:00.000Z";
const olderTimestamp = "2026-09-29T12:00:00.000Z";

export const demoPassword = {
  seller: "seller123",
  buyer: "buyer123",
};

export const demoUsers: Array<{
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}> = [
  {
    id: "demo-seller",
    email: "seller@example.com",
    displayName: "Seller",
    role: "seller",
    password: demoPassword.seller,
  },
  {
    id: "demo-buyer",
    email: "buyer@example.com",
    displayName: "Buyer A",
    role: "buyer",
    password: demoPassword.buyer,
  },
  {
    id: "demo-seller-2",
    email: "seller2@example.com",
    displayName: "Daniel Shah",
    role: "seller",
    password: demoPassword.seller,
  },
  {
    id: "demo-buyer-2",
    email: "buyer2@example.com",
    displayName: "Buyer B",
    role: "buyer",
    password: demoPassword.buyer,
  },
];

export const demoSellerProfiles: Array<
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
    userId: "demo-seller",
    bio: "Independent watch collector offering carefully documented pre-owned pieces, with clear condition notes and responsive service.",
    location: "Mumbai, India",
    memberSince: "2025-01-01T00:00:00.000Z",
    verificationStatus: "verified",
    responseRate: 92,
  },
  {
    userId: "demo-seller-2",
    bio: "Collector specialising in modern classics and well-maintained everyday watches.",
    location: "Pune, India",
    memberSince: "2026-01-15T00:00:00.000Z",
    verificationStatus: "pending",
    responseRate: 78,
  },
];

const publicWatchPhoto = (photoId: string, alt: string) => ({
  url: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=85`,
  alt,
});

const watchPhotos = {
  submariner: publicWatchPhoto(
    "photo-1523170335258-f5ed11844a49",
    "Steel luxury watch photographed on a wrist",
  ),
  speedmaster: publicWatchPhoto(
    "photo-1547996160-81dfa63595aa",
    "Luxury watch with dark dial and steel bracelet",
  ),
  santos: publicWatchPhoto(
    "photo-1524805444758-089113d48a6d",
    "Classic luxury watch product photograph",
  ),
  explorer: publicWatchPhoto(
    "photo-1522312346375-d1a52e2b99b3",
    "Close-up of a luxury watch dial",
  ),
  vintage: publicWatchPhoto(
    "photo-1508057198894-247b23fe5ade",
    "Vintage-style watch photographed on a dark background",
  ),
};

const makeListing = (
  listing: Omit<Listing, "createdAt" | "updatedAt" | "version"> &
    Partial<Pick<Listing, "createdAt" | "updatedAt" | "version">>,
): Listing => ({
  ...listing,
  createdAt: listing.createdAt ?? olderTimestamp,
  updatedAt: listing.updatedAt ?? demoTimestamp,
  version: listing.version ?? 1,
});

export const demoListings: Listing[] = [
  makeListing({
    id: "listing-rolex-submariner-126610ln",
    sellerId: "demo-seller",
    title: "Rolex Submariner Date 126610LN",
    brand: "Rolex",
    model: "Submariner Date",
    referenceNumber: "126610LN",
    description:
      "2023 steel Submariner Date with a black dial and ceramic bezel. Includes the pictured watch and original presentation box. The public images are representative; inspect the item and confirm included accessories with the seller before purchase.",
    condition: "Very good",
    year: 2023,
    location: "Mumbai, India",
    price: 46500,
    currency: "AED",
    category: "luxury-watches",
    images: [watchPhotos.submariner, watchPhotos.explorer],
    status: "active",
  }),
  makeListing({
    id: "listing-omega-speedmaster-moonwatch",
    sellerId: "demo-seller",
    title: "Omega Speedmaster Moonwatch Professional",
    brand: "Omega",
    model: "Speedmaster Professional",
    referenceNumber: "310.30.42.50.01.001",
    description:
      "Modern hand-wound Moonwatch with a black dial, hesalite crystal and steel bracelet. A strong everyday chronograph with service and condition details available directly from the seller.",
    condition: "Excellent",
    year: 2022,
    location: "Mumbai, India",
    price: 26500,
    currency: "AED",
    category: "luxury-watches",
    images: [watchPhotos.speedmaster, watchPhotos.submariner],
    status: "active",
  }),
  makeListing({
    id: "listing-cartier-santos-medium",
    sellerId: "demo-seller-2",
    title: "Cartier Santos de Cartier Medium WSSA0029",
    brand: "Cartier",
    model: "Santos de Cartier Medium",
    referenceNumber: "WSSA0029",
    description:
      "Steel Santos de Cartier with a silvered dial and interchangeable bracelet and strap system. Ask the seller to confirm the included links, accessories and service history.",
    condition: "Very good",
    year: 2021,
    location: "Pune, India",
    price: 31800,
    currency: "AED",
    category: "luxury-watches",
    images: [watchPhotos.santos, watchPhotos.speedmaster],
    status: "active",
  }),
  makeListing({
    id: "listing-rolex-explorer-124270",
    sellerId: "demo-seller-2",
    title: "Rolex Explorer 36 124270",
    brand: "Rolex",
    model: "Explorer 36",
    referenceNumber: "124270",
    description:
      "Understated 36 mm steel Explorer with a black dial and Oyster bracelet. Presented in carefully worn condition; contact the seller for additional photographs and set details.",
    condition: "Good",
    year: 2021,
    location: "Pune, India",
    price: 35900,
    currency: "AED",
    category: "luxury-watches",
    images: [watchPhotos.explorer],
    status: "active",
  }),
  makeListing({
    id: "listing-vintage-omega-seamaster",
    sellerId: "demo-seller",
    title: "Vintage Omega Seamaster Automatic",
    brand: "Omega",
    model: "Seamaster Automatic",
    referenceNumber: "Vintage reference - ask seller",
    description:
      "Vintage automatic Seamaster with a warm patina and classic proportions. Vintage pieces can vary substantially by reference and originality; request movement, case and service photographs before making an offer.",
    condition: "Good vintage",
    year: 1970,
    location: "Mumbai, India",
    price: 12900,
    currency: "AED",
    category: "vintage-watches",
    images: [watchPhotos.vintage, watchPhotos.santos],
    status: "active",
  }),
  ...[
    {
      fixture: "payment-pending",
      title: "Tudor Black Bay 58",
      brand: "Tudor",
      model: "Black Bay 58",
      referenceNumber: "79030N",
      price: 16400,
      status: "pending_payment",
      paymentStatus: "pending",
      fulfilmentStatus: "pending",
      transactionVersion: 1,
      offerVersion: 2,
      sellerId: "demo-seller",
    },
    {
      fixture: "payment-retry",
      title: "Grand Seiko Heritage Spring Drive",
      brand: "Grand Seiko",
      model: "Heritage Spring Drive",
      referenceNumber: "SBGA211",
      price: 24500,
      status: "pending_payment",
      paymentStatus: "failed",
      fulfilmentStatus: "pending",
      transactionVersion: 2,
      offerVersion: 3,
      sellerId: "demo-seller-2",
      paymentFailureCode: "demo_declined",
    },
    {
      fixture: "ready-to-ship",
      title: "IWC Pilot's Watch Mark XX",
      brand: "IWC",
      model: "Pilot's Watch Mark XX",
      referenceNumber: "IW328203",
      price: 33800,
      status: "paid",
      paymentStatus: "paid",
      fulfilmentStatus: "pending",
      transactionVersion: 2,
      offerVersion: 3,
      sellerId: "demo-seller",
    },
    {
      fixture: "in-transit",
      title: "Jaeger-LeCoultre Reverso Classic",
      brand: "Jaeger-LeCoultre",
      model: "Reverso Classic",
      referenceNumber: "Q3848420",
      price: 41200,
      status: "paid",
      paymentStatus: "paid",
      fulfilmentStatus: "shipped",
      transactionVersion: 3,
      offerVersion: 3,
      sellerId: "demo-seller-2",
    },
    {
      fixture: "ready-to-complete",
      title: "TAG Heuer Carrera Chronograph",
      brand: "TAG Heuer",
      model: "Carrera Chronograph",
      referenceNumber: "CBS2210.FC6534",
      price: 22100,
      status: "paid",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      transactionVersion: 4,
      offerVersion: 3,
      sellerId: "demo-seller",
    },
    {
      fixture: "completed",
      title: "Patek Philippe Calatrava",
      brand: "Patek Philippe",
      model: "Calatrava",
      referenceNumber: "5227G-010",
      price: 109000,
      status: "completed",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      transactionVersion: 5,
      offerVersion: 3,
      sellerId: "demo-seller-2",
    },
    {
      fixture: "cancelled",
      title: "Breitling Navitimer B01 Chronograph",
      brand: "Breitling",
      model: "Navitimer B01 Chronograph",
      referenceNumber: "AB0139211B1A1",
      price: 37500,
      status: "cancelled",
      paymentStatus: "refunded",
      fulfilmentStatus: "pending",
      transactionVersion: 3,
      offerVersion: 3,
      sellerId: "demo-seller",
    },
    {
      fixture: "disputed",
      title: "Audemars Piguet Royal Oak Selfwinding",
      brand: "Audemars Piguet",
      model: "Royal Oak Selfwinding",
      referenceNumber: "15510ST",
      price: 146000,
      status: "disputed",
      paymentStatus: "paid",
      fulfilmentStatus: "delivered",
      transactionVersion: 5,
      offerVersion: 3,
      sellerId: "demo-seller-2",
    },
  ].map((item, index) =>
    makeListing({
      id: `listing-${item.fixture}`,
      sellerId: item.sellerId,
      title: item.title,
      brand: item.brand,
      model: item.model,
      referenceNumber: item.referenceNumber,
      description: `${item.title} in a completed marketplace order. This demonstration record is provided for reviewing ${item.fixture.replaceAll("-", " ")} transaction steps.`,
      condition: index % 2 === 0 ? "Excellent" : "Very good",
      year: 2019 + (index % 6),
      location: item.sellerId === "demo-seller" ? "Mumbai, India" : "Pune, India",
      price: item.price,
      currency: "AED",
      category: "luxury-watches",
      images: [watchPhotos[index % 2 === 0 ? "submariner" : "speedmaster"]],
      status: "sold",
      version: 2,
    }),
  ),
];

const transactionFixtures = [
  {
    fixture: "payment-pending",
    status: "pending_payment",
    paymentStatus: "pending",
    fulfilmentStatus: "pending",
    version: 1,
  },
  {
    fixture: "payment-retry",
    status: "pending_payment",
    paymentStatus: "failed",
    fulfilmentStatus: "pending",
    version: 2,
    paymentFailureCode: "demo_declined",
  },
  {
    fixture: "ready-to-ship",
    status: "paid",
    paymentStatus: "paid",
    fulfilmentStatus: "pending",
    version: 2,
  },
  {
    fixture: "in-transit",
    status: "paid",
    paymentStatus: "paid",
    fulfilmentStatus: "shipped",
    version: 3,
  },
  {
    fixture: "ready-to-complete",
    status: "paid",
    paymentStatus: "paid",
    fulfilmentStatus: "delivered",
    version: 4,
  },
  {
    fixture: "completed",
    status: "completed",
    paymentStatus: "paid",
    fulfilmentStatus: "delivered",
    version: 5,
  },
  {
    fixture: "cancelled",
    status: "cancelled",
    paymentStatus: "refunded",
    fulfilmentStatus: "pending",
    version: 3,
  },
  {
    fixture: "disputed",
    status: "disputed",
    paymentStatus: "paid",
    fulfilmentStatus: "delivered",
    version: 5,
  },
] as const;

const transactionListing = (fixture: string): Listing => {
  const listing = demoListings.find((item) => item.id === `listing-${fixture}`);
  if (!listing) {
    throw new Error(`Demo transaction listing is missing for "${fixture}".`);
  }
  return listing;
};

export const demoOffers: Offer[] = [
  {
    id: "offer-submariner-pending-buyer-b",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer-2",
    sellerId: "demo-seller",
    amount: 44000,
    currency: "AED",
    status: "pending",
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
    version: 1,
  },
  {
    id: "offer-submariner-countered",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer",
    sellerId: "demo-seller",
    amount: 42500,
    currency: "AED",
    status: "countered",
    createdAt: olderTimestamp,
    updatedAt: demoTimestamp,
    version: 2,
  },
  {
    id: "offer-submariner-buyer-response",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer",
    sellerId: "demo-seller",
    amount: 43500,
    currency: "AED",
    status: "pending",
    parentOfferId: "offer-submariner-countered",
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
    version: 1,
  },
  {
    id: "offer-submariner-rejected",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer-2",
    sellerId: "demo-seller",
    amount: 39000,
    currency: "AED",
    status: "rejected",
    createdAt: olderTimestamp,
    updatedAt: demoTimestamp,
    version: 2,
  },
  {
    id: "offer-submariner-withdrawn",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer-2",
    sellerId: "demo-seller",
    amount: 40500,
    currency: "AED",
    status: "withdrawn",
    createdAt: olderTimestamp,
    updatedAt: demoTimestamp,
    version: 2,
  },
  {
    id: "offer-submariner-expired",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer-2",
    sellerId: "demo-seller",
    amount: 41000,
    currency: "AED",
    status: "expired",
    createdAt: olderTimestamp,
    updatedAt: demoTimestamp,
    version: 2,
  },
  ...transactionFixtures.map((fixture) => {
    const listing = transactionListing(fixture.fixture);
    return {
      id: `offer-${fixture.fixture}`,
      listingId: listing.id,
      buyerId: "demo-buyer",
      sellerId: listing.sellerId,
      amount: listing.price - 500,
      currency: "AED",
      status: "accepted" as const,
      createdAt: olderTimestamp,
      updatedAt: demoTimestamp,
      version: 3,
    };
  }),
];

export const demoTransactions: Transaction[] = transactionFixtures.map(
  (fixture) => {
    const listing = transactionListing(fixture.fixture);
    return {
      id: `transaction-${fixture.fixture}`,
      listingId: listing.id,
      offerId: `offer-${fixture.fixture}`,
      buyerId: "demo-buyer",
      sellerId: listing.sellerId,
      amount: listing.price - 500,
      currency: "AED",
      status: fixture.status,
      paymentStatus: fixture.paymentStatus,
      fulfilmentStatus: fixture.fulfilmentStatus,
      createdAt: olderTimestamp,
      updatedAt: demoTimestamp,
      ...(fixture.status === "completed" ? { completedAt: demoTimestamp } : {}),
      ...(fixture.status === "cancelled" ? { cancelledAt: demoTimestamp } : {}),
      ...("paymentFailureCode" in fixture
        ? {
            paymentAttemptKey: "demo-payment-attempt-failed",
            paymentProvider: "demo",
            paymentFailureCode: fixture.paymentFailureCode,
            paymentFailedAt: demoTimestamp,
          }
        : {}),
      ...(fixture.paymentStatus === "paid" ? { paidAt: olderTimestamp } : {}),
      version: fixture.version,
    };
  },
);

export const demoConversations: ConversationRecord[] = [
  {
    id: "conversation-submariner-buyer-seller",
    listingId: "listing-rolex-submariner-126610ln",
    buyerId: "demo-buyer",
    sellerId: "demo-seller",
    lastMessageAt: demoTimestamp,
    lastMessagePreview: "I can share the service invoice before you decide.",
    createdAt: olderTimestamp,
    updatedAt: demoTimestamp,
    buyerLastReadAt: olderTimestamp,
  },
  {
    id: "conversation-cartier-buyer-b",
    listingId: "listing-cartier-santos-medium",
    buyerId: "demo-buyer-2",
    sellerId: "demo-seller-2",
    lastMessageAt: olderTimestamp,
    lastMessagePreview: "Collection in Pune can be arranged.",
    createdAt: olderTimestamp,
    updatedAt: olderTimestamp,
    buyerLastReadAt: demoTimestamp,
    sellerLastReadAt: demoTimestamp,
  },
];

export const demoMessages: Message[] = [
  {
    id: "message-submariner-1",
    conversationId: "conversation-submariner-buyer-seller",
    senderId: "demo-buyer",
    body: "Could you share the service history and confirm the bracelet links?",
    createdAt: olderTimestamp,
    readAt: olderTimestamp,
  },
  {
    id: "message-submariner-2",
    conversationId: "conversation-submariner-buyer-seller",
    senderId: "demo-seller",
    body: "Of course. I can share the service invoice before you decide.",
    createdAt: demoTimestamp,
  },
  {
    id: "message-cartier-1",
    conversationId: "conversation-cartier-buyer-b",
    senderId: "demo-buyer-2",
    body: "Is collection in Pune possible?",
    createdAt: olderTimestamp,
    readAt: demoTimestamp,
  },
  {
    id: "message-cartier-2",
    conversationId: "conversation-cartier-buyer-b",
    senderId: "demo-seller-2",
    body: "Collection in Pune can be arranged.",
    createdAt: demoTimestamp,
    readAt: demoTimestamp,
  },
];

export const demoNotifications: Notification[] = [
  {
    id: "notification-submariner-offer",
    userId: "demo-seller",
    type: "offer_received",
    title: "New offer received",
    body: "Buyer B made an offer on your Submariner Date.",
    resourceType: "offer",
    resourceId: "offer-submariner-pending-buyer-b",
    sourceEventId: "demo-event-submariner-offer",
    createdAt: demoTimestamp,
  },
  {
    id: "notification-submariner-message",
    userId: "demo-buyer",
    type: "message_received",
    title: "Seller replied",
    body: "Seller replied about the Submariner Date service history.",
    resourceType: "conversation",
    resourceId: "conversation-submariner-buyer-seller",
    sourceEventId: "demo-event-submariner-message",
    createdAt: demoTimestamp,
  },
  {
    id: "notification-payment-failed",
    userId: "demo-buyer",
    type: "payment_failed",
    title: "Payment needs another attempt",
    body: "Retry payment for the Grand Seiko order.",
    resourceType: "transaction",
    resourceId: "transaction-payment-retry",
    sourceEventId: "demo-event-payment-failed",
    createdAt: olderTimestamp,
    readAt: demoTimestamp,
  },
  {
    id: "notification-item-shipped",
    userId: "demo-buyer",
    type: "shipment_created",
    title: "Your Reverso has shipped",
    body: "The seller marked the Reverso order as shipped.",
    resourceType: "transaction",
    resourceId: "transaction-in-transit",
    sourceEventId: "demo-event-item-shipped",
    createdAt: olderTimestamp,
    readAt: demoTimestamp,
  },
];
