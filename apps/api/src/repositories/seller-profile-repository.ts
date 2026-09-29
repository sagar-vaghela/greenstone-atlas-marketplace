import type {
  SellerProfile,
  SellerVerificationStatus,
  UpdateSellerProfileInput,
} from "@atlas/types";

export interface CreateSellerProfileInput {
  userId: string;
  memberSince?: string;
  verificationStatus?: SellerVerificationStatus;
  completedSales?: never;
  responseRate?: number;
}

export interface SellerProfileRepository {
  findByUserId(userId: string): Promise<SellerProfile | undefined>;
  create(input: CreateSellerProfileInput): Promise<SellerProfile>;
  update(
    userId: string,
    input: UpdateSellerProfileInput,
  ): Promise<SellerProfile | undefined>;
  ensureIndexes(): Promise<void>;
}
