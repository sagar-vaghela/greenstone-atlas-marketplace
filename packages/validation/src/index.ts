import type {
  CreateListingInput,
  Listing,
  ListingStatus,
  UpdateListingInput,
} from '@atlas/types';
import { z } from 'zod';

const listingStatusSchema = z.enum(['draft', 'active', 'sold']);

export const createListingSchema: z.ZodType<CreateListingInput> = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

export const updateListingSchema: z.ZodType<UpdateListingInput> = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    price: z.number().finite().nonnegative().optional(),
    currency: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    status: listingStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const listingSchema: z.ZodType<Listing> = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1),
  category: z.string().trim().min(1),
  status: listingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type { CreateListingInput, Listing, ListingStatus, UpdateListingInput };
