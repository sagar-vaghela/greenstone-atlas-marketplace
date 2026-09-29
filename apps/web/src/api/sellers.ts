import type { Listing, SellerProfileResponse } from "@atlas/types";
import { request } from "./client";

export const getSellerProfile = (
  sellerId: string,
): Promise<SellerProfileResponse> =>
  request<SellerProfileResponse>(`/sellers/${encodeURIComponent(sellerId)}`);

export const getSellerListings = (sellerId: string): Promise<Listing[]> =>
  request<{ items: Listing[] }>(
    `/sellers/${encodeURIComponent(sellerId)}/listings`,
  ).then((response) => response.items);

export const getCurrentSellerProfile = (): Promise<SellerProfileResponse> =>
  request<SellerProfileResponse>("/me/seller-profile");

export const updateSellerProfile = (input: {
  displayName?: string;
  bio?: string;
  location?: string;
}): Promise<SellerProfileResponse> =>
  request<SellerProfileResponse>("/me/seller-profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
