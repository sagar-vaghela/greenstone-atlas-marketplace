import type {
  CreateListingInput,
  Listing,
  UpdateListingInput,
} from "@atlas/types";
import type { ListingRepository } from "./listing-repository.js";

const seedListings: CreateListingInput[] = [
  {
    title: "Demo Mechanical Keyboard",
    description: "Development listing for a compact mechanical keyboard.",
    price: 4999,
    currency: "INR",
    category: "electronics",
  },
  {
    title: "Demo Reading Chair",
    description: "Development listing for a comfortable reading chair.",
    price: 8500,
    currency: "INR",
    category: "furniture",
  },
];

export class InMemoryListingRepository implements ListingRepository {
  private readonly listings: Listing[];
  private nextId: number;

  constructor() {
    this.listings = seedListings.map((input, index) =>
      this.createListing(`listing-${index + 1}`, input),
    );
    this.nextId = this.listings.length + 1;
  }

  async list(): Promise<Listing[]> {
    return this.listings.map((listing) => ({ ...listing }));
  }

  async findById(id: string): Promise<Listing | undefined> {
    const listing = this.listings.find((item) => item.id === id);
    return listing ? { ...listing } : undefined;
  }

  async create(input: CreateListingInput): Promise<Listing> {
    const listing = this.createListing(`listing-${this.nextId}`, input);
    this.nextId += 1;
    this.listings.push(listing);
    return { ...listing };
  }

  async update(
    id: string,
    input: UpdateListingInput,
  ): Promise<Listing | undefined> {
    const index = this.listings.findIndex((listing) => listing.id === id);
    if (index === -1) {
      return undefined;
    }

    const updatedListing: Listing = {
      ...this.listings[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.listings[index] = updatedListing;
    return { ...updatedListing };
  }

  private createListing(id: string, input: CreateListingInput): Listing {
    const timestamp = new Date().toISOString();
    return {
      ...input,
      id,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
