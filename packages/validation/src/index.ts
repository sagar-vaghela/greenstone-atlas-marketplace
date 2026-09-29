import type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingImage,
  ListingSort,
  ListingStatus,
  UpdateListingInput,
} from "@atlas/types";
import { z } from "zod";

export const listingStatusSchema: z.ZodType<ListingStatus> = z.enum([
  "draft",
  "active",
  "sold",
]);
const listingSortSchema: z.ZodType<ListingSort> = z.enum([
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
]);

const queryNumberSchema = z.preprocess((value) => {
  if (value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return value;
}, z.number().finite().nonnegative());

export const listingImageSchema: z.ZodType<ListingImage> = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "Image URL must use HTTP or HTTPS"),
  alt: z.string().trim().max(2048).optional(),
});

const listingImagesSchema = z.array(listingImageSchema).max(8);

export const listingQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    minPrice: queryNumberSchema.optional(),
    maxPrice: queryNumberSchema.optional(),
    sort: listingSortSchema.optional(),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  );

export const createListingSchema: z.ZodType<CreateListingInput> = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  category: z.string().trim().min(1),
  images: listingImagesSchema.default([]),
});

export const updateListingSchema: z.ZodType<UpdateListingInput> = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    price: z.number().finite().nonnegative().optional(),
    currency: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    images: listingImagesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const updateListingStatusSchema = z.object({
  status: listingStatusSchema,
});

export const listingSchema: z.ZodType<Listing> = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  category: z.string().trim().min(1),
  images: listingImagesSchema.default([]),
  status: listingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingSort,
  ListingStatus,
  UpdateListingInput,
};
