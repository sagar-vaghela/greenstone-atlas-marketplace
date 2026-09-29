import type { ListingStatus } from "@atlas/types";

export class InvalidListingStatusTransitionError extends Error {
  constructor(
    readonly currentStatus: ListingStatus,
    readonly nextStatus: ListingStatus,
  ) {
    super(
      `Listing status cannot be changed from ${currentStatus} to ${nextStatus}`,
    );
    this.name = "InvalidListingStatusTransitionError";
  }
}

export const isValidListingStatusTransition = (
  currentStatus: ListingStatus,
  nextStatus: ListingStatus,
): boolean =>
  (currentStatus === "draft" && nextStatus === "active") ||
  (currentStatus === "active" && nextStatus === "sold");

export const assertValidListingStatusTransition = (
  currentStatus: ListingStatus,
  nextStatus: ListingStatus,
): void => {
  if (!isValidListingStatusTransition(currentStatus, nextStatus)) {
    throw new InvalidListingStatusTransitionError(currentStatus, nextStatus);
  }
};