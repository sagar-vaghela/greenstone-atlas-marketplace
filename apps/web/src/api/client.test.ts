import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./client";

afterEach(() => vi.restoreAllMocks());

describe("API client errors", () => {
  it("normalizes response errors and preserves request IDs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: { code: "CONFLICT", message: "Offer is no longer available." } }),
      { status: 409, headers: { "content-type": "application/json", "x-request-id": "offer-42" } },
    ));

    await expect(request("/offers/offer-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      kind: "conflict",
      requestId: "offer-42",
      message: "Offer is no longer available.",
    });
  });

  it("normalizes network failures without exposing fetch details", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("socket details"));

    await expect(request("/health")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      kind: "network",
      message: "Unable to reach the marketplace service.",
    } satisfies Partial<ApiError>);
  });
});