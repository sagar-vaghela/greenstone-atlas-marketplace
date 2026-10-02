import { describe, expect, it } from "vitest";
import { getApiConfig } from "../packages/config/src/index.ts";
import { isOriginAllowed } from "../apps/api/src/http/origin.ts";

describe("api config", () => {
  it("uses in-memory mode for local development without MongoDB configuration", () => {
    const config = getApiConfig({
      NODE_ENV: "development",
      PORT: "3000",
    });

    expect(config.mongodbUri).toBeUndefined();
    expect(config.mongodbDbName).toBe("atlas_marketplace");
    expect(config.demoSeedEnabled).toBe(false);
  });

  it("enables demo seeding only when explicitly configured", () => {
    expect(
      getApiConfig({
        NODE_ENV: "development",
        DEMO_SEED_ENABLED: "true",
      }).demoSeedEnabled,
    ).toBe(true);
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

  it("allows only the configured origin outside development", () => {
    const productionConfig = getApiConfig({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
      CORS_ORIGIN: "https://market.example",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    });

    expect(productionConfig.allowLocalOrigins).toBe(false);
    expect(isOriginAllowed("https://market.example", productionConfig)).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", productionConfig)).toBe(false);
    expect(isOriginAllowed("https://untrusted.example", productionConfig)).toBe(false);
  });

  it("normalizes a trailing slash on the configured frontend origin", () => {
    const productionConfig = getApiConfig({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
      CORS_ORIGIN: "https://market.example/",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    });

    expect(isOriginAllowed("https://market.example", productionConfig)).toBe(true);
  });

  it("keeps HTTPS cookies enabled for staging", () => {
    const stagingConfig = getApiConfig({
      NODE_ENV: "staging",
      MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
      CORS_ORIGIN: "https://market.example",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    });

    expect(stagingConfig.secureCookies).toBe(true);
    expect(stagingConfig.allowLocalOrigins).toBe(false);
    expect(isOriginAllowed("http://localhost:5173", stagingConfig)).toBe(false);
  });

  it("rejects Stripe live secret keys in production-like environments", () => {
    expect(() =>
      getApiConfig({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
        CORS_ORIGIN: "https://market.example",
        PAYMENT_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: ["sk", "live", "placeholder"].join("_"),
        STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
      }),
    ).toThrow(/Stripe Test Mode/);
  });

  it("rejects demo payment mode in production-like environments", () => {
    expect(() =>
      getApiConfig({
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
        CORS_ORIGIN: "https://market.example",
      }),
    ).toThrow(/PAYMENT_PROVIDER=stripe is required/);
  });

  it("accepts Stripe Test Mode secret keys in production-like environments", () => {
    const stripeConfig = getApiConfig({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://localhost:27017/atlas_marketplace",
      CORS_ORIGIN: "https://market.example",
      PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    });

    expect(stripeConfig.paymentProvider).toBe("stripe");
  });
});
