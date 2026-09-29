import type { Offer } from "@atlas/types";
import { request } from "./client";

const options = (role: "buyer" | "seller", body?: unknown, method?: "POST" | "PATCH"): RequestInit => ({
  method: method ?? (body === undefined ? "GET" : "POST"),
  headers: { "Content-Type": "application/json", "x-demo-role": role },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const getOffersForListing = (listingId: string): Promise<Offer[]> => request<{ items: Offer[] }>(`/listings/${encodeURIComponent(listingId)}/offers`).then((result) => result.items);
export const createOffer = (listingId: string, input: { buyerId: string; amount: number; currency: string; parentOfferId?: string }): Promise<Offer> => request<Offer>(`/listings/${encodeURIComponent(listingId)}/offers`, { ...options("buyer", input) });
export const updateOfferStatus = (id: string, status: "accepted" | "rejected" | "withdrawn", role: "buyer" | "seller"): Promise<Offer> => request<Offer>(`/offers/${encodeURIComponent(id)}/status`, { ...options(role, { status }, "PATCH") });
export const counterOffer = (id: string, input: { amount: number; currency: string }): Promise<Offer> => request<Offer>(`/offers/${encodeURIComponent(id)}/counter`, { ...options("seller", input) });