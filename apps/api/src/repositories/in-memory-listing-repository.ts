import type {
  CreateListingInput,
  CreateListingRepositoryInput,
  Listing,
  ListingQuery,
  ListingStatus,
  UpdateListingInput,
} from "@atlas/types";
import { assertValidListingStatusTransition } from "../domain/listing-status.js";
import type { ListingRepository } from "./listing-repository.js";

const seedListings: CreateListingRepositoryInput[] = [
  {
    title: "Rolex Submariner Date 126610LN",
    description:
      "Pre-owned luxury watch in excellent condition, with box and papers.",
    price: 1250000,
    currency: "INR",
    category: "luxury-watches",
    images: [],
    sellerId: "demo-seller",
  },
  {
    title: "Omega Speedmaster Professional Moonwatch",
    description: "Pre-owned chronograph offered by a verified-demo seller.",
    price: 620000,
    currency: "INR",
    category: "luxury-watches",
    images: [],
    sellerId: "demo-seller",
  },
  {
    title: "Cartier Santos Medium WSSA0029",
    description:
      "Pre-owned classic with a clean bracelet and broad wrist appeal.",
    price: 710000,
    currency: "INR",
    category: "luxury-watches",
    images: [],
    sellerId: "demo-seller-2",
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

  async list(query: ListingQuery = {}): Promise<Listing[]> {
    const search = query.search?.toLocaleLowerCase();
    const filteredListings = this.listings.filter((listing) => {
      const matchesSearch =
        !search ||
        listing.title.toLocaleLowerCase().includes(search) ||
        listing.description.toLocaleLowerCase().includes(search);
      const matchesCategory =
        !query.category || listing.category === query.category;
      const matchesMinPrice =
        query.minPrice === undefined || listing.price >= query.minPrice;
      const matchesMaxPrice =
        query.maxPrice === undefined || listing.price <= query.maxPrice;

      return (
        matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice
      );
    });

    return filteredListings
      .map((listing) => ({ ...listing }))
      .sort((left, right) => {
        if (query.sort === "price_asc") {
          return left.price - right.price || left.id.localeCompare(right.id);
        }
        if (query.sort === "price_desc") {
          return right.price - left.price || left.id.localeCompare(right.id);
        }
        if (query.sort === "oldest") {
          return (
            left.updatedAt.localeCompare(right.updatedAt) ||
            left.id.localeCompare(right.id)
          );
        }

        return (
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.id.localeCompare(right.id)
        );
      });
  }

  async findById(id: string): Promise<Listing | undefined> {
    const listing = this.listings.find((item) => item.id === id);
    return listing
      ? { ...listing, images: [...(listing.images ?? [])] }
      : undefined;
  }

  async create(input: CreateListingRepositoryInput): Promise<Listing> {
    const listing = this.createListing(`listing-${this.nextId}`, input);
    this.nextId += 1;
    this.listings.push(listing);
    return { ...listing, images: [...listing.images] };
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
    return { ...updatedListing, images: [...updatedListing.images] };
  }

  async updateStatus(
    id: string,
    status: ListingStatus,
  ): Promise<Listing | undefined> {
    const index = this.listings.findIndex((listing) => listing.id === id);
    if (index === -1) {
      return undefined;
    }

    const currentListing = this.listings[index];
    assertValidListingStatusTransition(currentListing.status, status);
    const updatedListing: Listing = {
      ...currentListing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.listings[index] = updatedListing;
    return { ...updatedListing, images: [...updatedListing.images] };
  }

  private createListing(
    id: string,
    input: CreateListingRepositoryInput,
  ): Listing {
    const timestamp = new Date().toISOString();
    return {
      ...input,
      images: [...(input.images ?? [])],
      sellerId: input.sellerId,
      id,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
