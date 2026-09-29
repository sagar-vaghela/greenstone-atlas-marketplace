export type ListingStatus = "draft" | "active" | "sold";

export type ListingSort = "newest" | "oldest" | "price_asc" | "price_desc";

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
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  status?: ListingStatus;
}
