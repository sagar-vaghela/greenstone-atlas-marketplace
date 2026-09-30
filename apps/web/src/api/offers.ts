import type { Offer } from "@atlas/types";
import { request } from "./client";

const options = (body?: unknown, method?: "POST" | "PATCH"): RequestInit => ({
  method: method ?? (body === undefined ? "GET" : "POST"),
  headers: { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const getOffersForListing = (listingId: string): Promise<Offer[]> =>
  request<{ items: Offer[] }>(
    `/listings/${encodeURIComponent(listingId)}/offers`,
  ).then((result) => result.items);
export const getOffer = (id: string): Promise<Offer> =>
  request<Offer>(`/offers/${encodeURIComponent(id)}`);
export const createOffer = (
  listingId: string,
  input: { amount: number; currency: string; parentOfferId?: string },
): Promise<Offer> =>
  request<Offer>(`/listings/${encodeURIComponent(listingId)}/offers`, {
    ...options(input),
  });
export const updateOfferStatus = (
  id: string,
  status: "accepted" | "rejected" | "withdrawn",
): Promise<Offer> =>
  request<{ offer: Offer } | Offer>(`/offers/${encodeURIComponent(id)}/status`, {
    ...options({ status }, "PATCH"),
  }).then((result) => ("offer" in result ? result.offer : result));
export const counterOffer = (
  id: string,
  input: { amount: number; currency: string },
): Promise<Offer> =>
  request<Offer>(`/offers/${encodeURIComponent(id)}/counter`, {
    ...options(input),
  });
