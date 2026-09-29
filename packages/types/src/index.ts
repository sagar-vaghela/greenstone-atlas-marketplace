export type ListingStatus = "draft" | "active" | "sold";

export type OfferStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn" | "expired";

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

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  images?: ListingImage[];
}
