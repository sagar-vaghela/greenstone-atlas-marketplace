const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = [
  "http://localhost:5173",
  "http://localhost:4173",
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
  mongodbUri?: string;
  mongodbDbName: string;
  sessionTtlMs: number;
  secureCookies: boolean;
  logLevel: string;
  slowRequestMs: number;
}

const parseCorsOrigin = (value: string | undefined): string | string[] => {
  if (!value || value.trim() === "") {
    return DEFAULT_CORS_ORIGIN;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 1 ? origins : origins[0] ?? DEFAULT_CORS_ORIGIN;
};

export const getApiConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ApiConfig => {
  const mongodbUri = env.MONGODB_URI?.trim() || undefined;

  const sessionTtlMs = Number(env.SESSION_TTL_MS);
  const slowRequestMs = Number(env.SLOW_REQUEST_MS);
  if (env.NODE_ENV === "production" && (!env.CORS_ORIGIN || parseCorsOrigin(env.CORS_ORIGIN).length === 0)) {
    throw new Error("CORS_ORIGIN is required in production");
  }

  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
    corsOrigin: parseCorsOrigin(env.CORS_ORIGIN),
    mongodbUri,
    mongodbDbName: env.MONGODB_DB_NAME?.trim() || DEFAULT_MONGODB_DB_NAME,
    sessionTtlMs: Number.isFinite(sessionTtlMs) && sessionTtlMs > 0 ? sessionTtlMs : DEFAULT_SESSION_TTL_MS,
    secureCookies: env.NODE_ENV === "production",
    logLevel: env.LOG_LEVEL?.trim() || "info",
    slowRequestMs: Number.isFinite(slowRequestMs) && slowRequestMs > 0 ? slowRequestMs : DEFAULT_SLOW_REQUEST_MS,
  };
};
