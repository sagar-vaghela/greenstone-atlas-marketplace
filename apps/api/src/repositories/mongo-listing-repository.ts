import { randomUUID } from "node:crypto";
import type {
  CreateListingInput,
  Listing,
  UpdateListingInput,
} from "@atlas/types";
import type { Collection, ObjectId } from "mongodb";
import type { ListingRepository } from "./listing-repository.js";

interface ListingDocument extends Listing {
  _id?: ObjectId;
}

const toListing = (document: ListingDocument): Listing => {
  const { _id: _ignoredId, ...listing } = document;
  return listing;
};

export class MongoListingRepository implements ListingRepository {
  constructor(private readonly collection: Collection<ListingDocument>) {}

  async list(): Promise<Listing[]> {
    const documents = await this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
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

  async create(input: CreateListingInput): Promise<Listing> {
    const timestamp = new Date().toISOString();
    const listing: ListingDocument = {
      ...input,
      id: `listing-${randomUUID()}`,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
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
      },
      {
        projection: { _id: 0 },
        returnDocument: "after",
      },
    );

    return document ? toListing(document) : undefined;
  }
}
