import type {
  CreateListingInput,
  Listing,
  ListingQuery,
  UpdateListingInput,
} from "@atlas/types";
import { request } from "./client";

interface ListingsResponse {
  items: Listing[];
}

export function getListings(query: ListingQuery = {}): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.category) params.set("category", query.category);
  if (query.minPrice !== undefined)
    params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined)
    params.set("maxPrice", String(query.maxPrice));
  if (query.sort) params.set("sort", query.sort);

  const queryString = params.toString();
  return request<ListingsResponse>(
    `/listings${queryString ? `?${queryString}` : ""}`,
  ).then((response) => response.items);
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

export function updateListing(
  id: string,
  input: UpdateListingInput,
): Promise<Listing> {
  return request<Listing>(`/listings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
