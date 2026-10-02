const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_PORTS = [
  5173, 5174, 5175, 5176, 5177, 5178, 4173, 4174, 4175,
];
const DEFAULT_CORS_ORIGIN = [
  ...DEFAULT_CORS_PORTS.flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]),
];
const DEFAULT_MONGODB_DB_NAME = "atlas_marketplace";
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SLOW_REQUEST_MS = 1000;

export const packageName = "atlas-marketplace";

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
};

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigin: string | string[];
  allowLocalOrigins: boolean;
  mongodbUri?: string;
  mongodbDbName: string;
  sessionTtlMs: number;
  secureCookies: boolean;
  logLevel: string;
  slowRequestMs: number;
  paymentProvider: "demo" | "stripe";
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePublishableKey?: string;
}

const parseCorsOrigin = (value: string | undefined): string | string[] => {
  if (!value || value.trim() === "") {
    return DEFAULT_CORS_ORIGIN;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .map((origin) => origin.replace(/\/+$/, ""))
    .filter(Boolean);

  return origins.length > 1 ? origins : (origins[0] ?? DEFAULT_CORS_ORIGIN);
};

export const getApiConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ApiConfig => {
  const mongodbUri = env.MONGODB_URI?.trim() || undefined;
  const productionLike =
    env.NODE_ENV === "production" || env.NODE_ENV === "staging";

  const sessionTtlMs = Number(env.SESSION_TTL_MS);
  const slowRequestMs = Number(env.SLOW_REQUEST_MS);
  const paymentProvider = env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "demo";
  const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim() || undefined;
  const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
  const stripePublishableKey = env.STRIPE_PUBLISHABLE_KEY?.trim() || undefined;

  if (mongodbUri && !/^mongodb(?:\+srv)?:\/\//i.test(mongodbUri)) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  if (!mongodbUri && productionLike) {
    throw new Error(
      "MONGODB_URI is required in production-like environments. Set it in the API runtime environment; MONGODB_DB_NAME defaults to atlas_marketplace.",
    );
  }

  if (productionLike && paymentProvider !== "stripe") {
    throw new Error(
      "PAYMENT_PROVIDER=stripe is required in production-like environments; demo payments cannot be used.",
    );
  }

  if (
    paymentProvider === "stripe" &&
    (!stripeSecretKey || !stripeWebhookSecret)
  ) {
    throw new Error(
      "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required when PAYMENT_PROVIDER=stripe",
    );
  }
  if (
    paymentProvider === "stripe" &&
    productionLike &&
    !/^(?:sk|rk)_test_/.test(stripeSecretKey ?? "")
  ) {
    throw new Error(
      "Production-like environments require a Stripe Test Mode secret key (sk_test_ or rk_test_)",
    );
  }
  if (
    productionLike &&
    (!env.CORS_ORIGIN || parseCorsOrigin(env.CORS_ORIGIN).length === 0)
  ) {
    throw new Error("CORS_ORIGIN is required in production-like environments");
  }

  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
    allowLocalOrigins: !productionLike,
    mongodbUri,
    mongodbDbName: env.MONGODB_DB_NAME?.trim() || DEFAULT_MONGODB_DB_NAME,
    sessionTtlMs:
      Number.isFinite(sessionTtlMs) && sessionTtlMs > 0
        ? sessionTtlMs
        : DEFAULT_SESSION_TTL_MS,
    secureCookies: productionLike,
    logLevel: env.LOG_LEVEL?.trim() || "info",
    slowRequestMs:
      Number.isFinite(slowRequestMs) && slowRequestMs > 0
        ? slowRequestMs
        : DEFAULT_SLOW_REQUEST_MS,
    paymentProvider,
    stripeSecretKey,
    stripeWebhookSecret,
    stripePublishableKey,
  };
};
