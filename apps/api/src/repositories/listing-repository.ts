import type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingStatus,
  UpdateListingInput,
} from "@atlas/types";

export interface ListingRepository {
  list(query?: ListingQuery): Promise<Listing[]>;
  findById(id: string): Promise<Listing | undefined>;
  create(input: CreateListingInput): Promise<Listing>;
  update(id: string, input: UpdateListingInput): Promise<Listing | undefined>;
  updateStatus(id: string, status: ListingStatus): Promise<Listing | undefined>;
}
