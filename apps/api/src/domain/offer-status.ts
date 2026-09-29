import type { OfferStatus } from "@atlas/types";
export class InvalidOfferTransitionError extends Error {}
export const assertValidOfferTransition = (current: OfferStatus, next: OfferStatus): void => {
  const allowed: Record<OfferStatus, OfferStatus[]> = {
    pending: ["accepted", "rejected", "countered", "withdrawn", "expired"],
    countered: ["accepted", "rejected", "withdrawn", "expired"],
    accepted: [], rejected: [], withdrawn: [], expired: [],
  };
  if (!allowed[current].includes(next)) throw new InvalidOfferTransitionError(`Cannot change an ${current} offer to ${next}.`);
};