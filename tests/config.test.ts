import { describe, expect, it } from "vitest";
import { getApiConfig } from "../packages/config/src/index.ts";

describe("api config", () => {
  it("uses in-memory mode for local development without MongoDB configuration", () => {
    const config = getApiConfig({
      NODE_ENV: "development",
      PORT: "3000",
    });

    expect(config.mongodbUri).toBeUndefined();
    expect(config.mongodbDbName).toBe("atlas_marketplace");
  });

  it("requires MongoDB in production-like environments", () => {
    expect(() =>
      getApiConfig({
        NODE_ENV: "production",
        PORT: "3000",
        CORS_ORIGIN: "http://localhost:5173",
      }),
    ).toThrow(/MONGODB_URI/);
  });
});
