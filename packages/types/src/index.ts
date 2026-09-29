export type ListingStatus = 'draft' | 'active' | 'sold';

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
