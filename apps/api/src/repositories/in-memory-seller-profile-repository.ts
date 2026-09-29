import type { SellerProfile } from "@atlas/types";
import type {
  CreateSellerProfileInput,
  SellerProfileRepository,
} from "./seller-profile-repository.js";

const seededProfiles: SellerProfile[] = [
  {
    userId: "demo-seller",
    bio: "Independent watch collector offering carefully documented pre-owned pieces.",
    location: "Mumbai, India",
    memberSince: "2025-01-01T00:00:00.000Z",
    verificationStatus: "verified",
    responseRate: 92,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    userId: "demo-seller-2",
    bio: "A small collection of modern classics and daily-wear favourites.",
    location: "Pune, India",
    memberSince: "2026-01-15T00:00:00.000Z",
    verificationStatus: "pending",
    responseRate: 78,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
];

export class InMemorySellerProfileRepository implements SellerProfileRepository {
  private readonly profiles = new Map(
    seededProfiles.map((profile) => [profile.userId, profile]),
  );

  async findByUserId(userId: string): Promise<SellerProfile | undefined> {
    const profile = this.profiles.get(userId);
    return profile ? { ...profile } : undefined;
  }

  async create(input: CreateSellerProfileInput): Promise<SellerProfile> {
    const timestamp = new Date().toISOString();
    const profile: SellerProfile = {
      userId: input.userId,
      memberSince: input.memberSince ?? timestamp,
      verificationStatus: input.verificationStatus ?? "unverified",
      responseRate: input.responseRate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.profiles.set(profile.userId, profile);
    return { ...profile };
  }

  async update(
    userId: string,
    input: Parameters<SellerProfileRepository["update"]>[1],
  ): Promise<SellerProfile | undefined> {
    const profile = this.profiles.get(userId);
    if (!profile) return undefined;
    const updated = {
      ...profile,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(userId, updated);
    return { ...updated };
  }

  async ensureIndexes(): Promise<void> {}
}
