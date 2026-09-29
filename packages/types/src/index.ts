export type ListingStatus = "draft" | "active" | "sold";

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
  description: string;
  price: number;
  currency: string;
  category: string;
  images: ListingImage[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
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
  | "offer.created"
  | "offer.countered"
  | "offer.accepted"
  | "offer.rejected"
  | "offer.withdrawn"
  | "listing.status_changed";

export type MarketplaceEventPayload =
  | { offer: Offer }
  | { listing: Listing };

export interface MarketplaceEvent {
  id: string;
  type: MarketplaceEventType;
  timestamp: string;
  listingId: string;
  offerId?: string;
  actorUserId?: string;
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
  description: string;
  price: number;
  currency: string;
  category: string;
  images: ListingImage[];
}

export interface CreateListingRepositoryInput extends CreateListingInput {
  sellerId: string;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  images?: ListingImage[];
}
