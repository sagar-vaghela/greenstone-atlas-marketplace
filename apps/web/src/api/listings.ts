import type { CreateListingInput, Listing } from "@atlas/types";
import { request } from "./client";

interface ListingsResponse {
  items: Listing[];
}

export function getListings(): Promise<Listing[]> {
  return request<ListingsResponse>("/listings").then(
    (response) => response.items,
  );
}

export function getListingById(id: string): Promise<Listing> {
  return request<Listing>(`/listings/${encodeURIComponent(id)}`);
}

export function createListing(input: CreateListingInput): Promise<Listing> {
  return request<Listing>("/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
