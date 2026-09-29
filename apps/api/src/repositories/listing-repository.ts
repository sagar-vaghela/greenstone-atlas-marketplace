import type {
  CreateListingInput,
  Listing,
  UpdateListingInput,
} from "@atlas/types";

export interface ListingRepository {
  list(): Promise<Listing[]>;
  findById(id: string): Promise<Listing | undefined>;
  create(input: CreateListingInput): Promise<Listing>;
  update(id: string, input: UpdateListingInput): Promise<Listing | undefined>;
}
