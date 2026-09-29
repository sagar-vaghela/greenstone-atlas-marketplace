import type {
  CreateListingInput,
  Listing,
  UpdateListingInput,
} from '@atlas/types';

export interface ListingRepository {
  list(): Listing[];
  findById(id: string): Listing | undefined;
  create(input: CreateListingInput): Listing;
  update(id: string, input: UpdateListingInput): Listing | undefined;
}
