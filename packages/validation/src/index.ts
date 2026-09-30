import type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingImage,
  ListingSort,
  ListingStatus,
  CreateOfferInput,
  Offer,
  OfferStatus,
  Transaction,
  TransactionStatus,
  PaymentStatus,
  FulfilmentStatus,
  UpdateListingInput,
  User,
  UpdateSellerProfileInput,
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

export const registerSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(256),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const updateSellerProfileSchema: z.ZodType<UpdateSellerProfileInput> = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    bio: z.string().trim().max(500).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field must be provided",
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
  sellerId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  category: z.string().trim().min(1),
  images: listingImagesSchema.default([]),
  status: listingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().nonnegative(),
});

export const offerStatusSchema: z.ZodType<OfferStatus> = z.enum([
  "pending",
  "countered",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
]);

export const transactionStatusSchema: z.ZodType<TransactionStatus> = z.enum([
  "pending_payment",
  "paid",
  "completed",
  "cancelled",
  "disputed",
]);

export const paymentStatusSchema: z.ZodType<PaymentStatus> = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const fulfilmentStatusSchema: z.ZodType<FulfilmentStatus> = z.enum([
  "pending",
  "shipped",
  "delivered",
]);

const moneySchema = z
  .number()
  .finite()
  .positive()
  .refine(
    (value) => Number.isInteger(Math.round(value * 100)),
    "Amount must use at most two decimal places",
  );
const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
export const createOfferSchema: z.ZodType<CreateOfferInput> = z.object({
  listingId: z.string().trim().min(1),
  buyerId: z.string().trim().min(1),
  sellerId: z.string().trim().min(1),
  amount: moneySchema,
  currency: currencySchema,
  parentOfferId: z.string().trim().min(1).optional(),
});
export const createOfferRequestSchema = z.object({
  amount: moneySchema,
  currency: currencySchema,
  parentOfferId: z.string().trim().min(1).optional(),
});
export const counterOfferRequestSchema = z.object({
  amount: moneySchema,
  currency: currencySchema,
});
export const updateOfferStatusSchema = z.object({
  status: z.enum(["accepted", "rejected", "withdrawn"]),
});

export const transactionSchema: z.ZodType<Transaction> = z.object({
  id: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
  offerId: z.string().trim().min(1),
  buyerId: z.string().trim().min(1),
  sellerId: z.string().trim().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  status: transactionStatusSchema,
  paymentStatus: paymentStatusSchema,
  fulfilmentStatus: fulfilmentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  version: z.number().int().nonnegative(),
});

export type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingSort,
  ListingStatus,
  UpdateListingInput,
  CreateOfferInput,
  Offer,
  OfferStatus,
  Transaction,
  TransactionStatus,
  PaymentStatus,
  FulfilmentStatus,
  User,
  UpdateSellerProfileInput,
};
