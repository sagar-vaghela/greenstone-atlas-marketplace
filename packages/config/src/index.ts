const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";
const DEFAULT_MONGODB_DB_NAME = "atlas_marketplace";

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
  corsOrigin: string;
  mongodbUri?: string;
  mongodbDbName: string;
}

export const getApiConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ApiConfig => {
  const mongodbUri = env.MONGODB_URI?.trim() || undefined;

  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
    corsOrigin: env.CORS_ORIGIN?.trim() || DEFAULT_CORS_ORIGIN,
    mongodbUri,
    mongodbDbName: env.MONGODB_DB_NAME?.trim() || DEFAULT_MONGODB_DB_NAME,
  };
};
