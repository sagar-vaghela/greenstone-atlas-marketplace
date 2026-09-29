import type {
  SellerProfileResponse,
  UpdateSellerProfileInput,
} from "@atlas/types";
import { updateSellerProfileSchema } from "@atlas/validation";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { ListingRepository } from "../repositories/listing-repository.js";
import type { SellerProfileRepository } from "../repositories/seller-profile-repository.js";
import type { UserRepository } from "../repositories/user-repository.js";

interface Options {
  users: UserRepository;
  listings: ListingRepository;
  profiles: SellerProfileRepository;
}
interface SellerParams {
  sellerId: string;
}
const error = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  status: number,
  code: string,
  message: string,
) => reply.status(status).send({ error: { code, message } });

const publicProfile = async (
  sellerId: string,
  options: Options,
): Promise<SellerProfileResponse | undefined> => {
  const user = await options.users.findById(sellerId);
  const profile = await options.profiles.findByUserId(sellerId);
  if (!user || !profile) return undefined;
  const listings = await options.listings.list();
  return {
    user: { id: user.id, displayName: user.displayName },
    profile: {
      bio: profile.bio,
      location: profile.location,
      memberSince: profile.memberSince,
      verificationStatus: profile.verificationStatus,
      responseRate: profile.responseRate,
    },
    stats: {
      activeListings: listings.filter(
        (listing) =>
          listing.sellerId === sellerId && listing.status === "active",
      ).length,
      soldListings: listings.filter(
        (listing) => listing.sellerId === sellerId && listing.status === "sold",
      ).length,
    },
  };
};

export const registerSellerRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.get<{ Params: SellerParams }>(
    "/sellers/:sellerId",
    async (request, reply) => {
      const result = await publicProfile(request.params.sellerId, options);
      return result
        ? result
        : error(
            reply,
            404,
            "SELLER_NOT_FOUND",
            "This seller profile is no longer available.",
          );
    },
  );

  app.get<{ Params: SellerParams }>(
    "/sellers/:sellerId/listings",
    async (request, reply) => {
      if (!(await publicProfile(request.params.sellerId, options))) {
        return error(
          reply,
          404,
          "SELLER_NOT_FOUND",
          "This seller profile is no longer available.",
        );
      }
      return {
        items: (await options.listings.list()).filter(
          (listing) =>
            listing.sellerId === request.params.sellerId &&
            listing.status === "active",
        ),
      };
    },
  );

  app.get("/me/seller-profile", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const result = await publicProfile(user.id, options);
    return result
      ? result
      : error(
          reply,
          404,
          "SELLER_PROFILE_NOT_FOUND",
          "Create your seller profile before editing it.",
        );
  });

  app.patch<{ Body: unknown }>(
    "/me/seller-profile",
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const user = requireAuthenticatedUser(request, reply);
      if (!user) return;
      const parsed = updateSellerProfileSchema.safeParse(request.body);
      if (!parsed.success)
        return error(
          reply,
          400,
          "VALIDATION_ERROR",
          "Please enter valid profile details.",
        );
      const input: UpdateSellerProfileInput = parsed.data;
      let profile = await options.profiles.findByUserId(user.id);
      if (!profile) {
        await options.profiles.create({ userId: user.id });
        profile = await options.profiles.findByUserId(user.id);
      }
      if (input.displayName)
        await options.users.updateDisplayName(user.id, input.displayName);
      const updated = await options.profiles.update(user.id, {
        bio: input.bio,
        location: input.location,
      });
      const result = await publicProfile(user.id, options);
      return updated && result
        ? result
        : error(
            reply,
            500,
            "PROFILE_UPDATE_FAILED",
            "Unable to save your profile.",
          );
    },
  );
};
