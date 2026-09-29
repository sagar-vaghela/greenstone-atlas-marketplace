export type ListingStatus = "draft" | "active" | "sold";

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
