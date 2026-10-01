import { randomUUID } from "node:crypto";
import type {
  CreateListingRepositoryInput,
  Listing,
  ListingQuery,
  ListingStatus,
  UpdateListingInput,
} from "@atlas/types";
import type { Collection, ObjectId } from "mongodb";
import { assertValidListingStatusTransition } from "../domain/listing-status.js";
import type { ListingRepository } from "./listing-repository.js";

interface ListingDocument extends Listing {
  _id?: ObjectId;
}

const toListing = (document: ListingDocument): Listing => {
  const { _id: _ignoredId, ...listing } = document;
  return {
    ...listing,
    sellerId: listing.sellerId ?? "demo-seller",
    images: listing.images ?? [],
    version: listing.version ?? 1,
  };
};

export class MongoListingRepository implements ListingRepository {
  constructor(private readonly collection: Collection<ListingDocument>) {}

  async list(query: ListingQuery = {}): Promise<Listing[]> {
    const filter: Record<string, unknown> = {};
    if (query.search) {
      const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchPattern = new RegExp(escapedSearch, "i");
      filter.$or = [
        { title: searchPattern },
        { brand: searchPattern },
        { model: searchPattern },
        { referenceNumber: searchPattern },
        { description: searchPattern },
        { location: searchPattern },
      ];
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {
        ...(query.minPrice === undefined ? {} : { $gte: query.minPrice }),
        ...(query.maxPrice === undefined ? {} : { $lte: query.maxPrice }),
      };
    }

    const sort: Record<string, 1 | -1> =
      query.sort === "price_asc"
        ? { price: 1, id: 1 }
        : query.sort === "price_desc"
          ? { price: -1, id: 1 }
          : query.sort === "oldest"
            ? { updatedAt: 1, id: 1 }
            : { updatedAt: -1, id: 1 };
    const documents = await this.collection
      .find(filter, { projection: { _id: 0 } })
      .sort(sort)
      .toArray();

    return documents.map(toListing);
  }

  async findById(id: string): Promise<Listing | undefined> {
    const document = await this.collection.findOne(
      { id },
      { projection: { _id: 0 } },
    );
    return document ? toListing(document) : undefined;
  }

  async create(input: CreateListingRepositoryInput): Promise<Listing> {
    const timestamp = new Date().toISOString();
    const listing: ListingDocument = {
      ...input,
      id: `listing-${randomUUID()}`,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    };

    await this.collection.insertOne(listing);
    return toListing(listing);
  }

  async update(
    id: string,
    input: UpdateListingInput,
  ): Promise<Listing | undefined> {
    const document = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: {
          ...input,
          updatedAt: new Date().toISOString(),
        },
        $inc: { version: 1 },
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    return document ? toListing(document) : undefined;
  }

  async updateStatus(
    id: string,
    status: ListingStatus,
  ): Promise<Listing | undefined> {
    const currentDocument = await this.collection.findOne({ id });
    if (!currentDocument) {
      return undefined;
    }

    assertValidListingStatusTransition(currentDocument.status, status);
    const document = await this.collection.findOneAndUpdate(
      { id, status: currentDocument.status },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString(),
          version: (currentDocument.version ?? 1) + 1,
        },
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    return document ? toListing(document) : undefined;
  }
}
