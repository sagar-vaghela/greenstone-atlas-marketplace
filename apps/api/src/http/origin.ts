import type { ApiConfig } from "@atlas/config";

type OriginConfig = Pick<ApiConfig, "corsOrigin" | "allowLocalOrigins">;

export const isOriginAllowed = (
  origin: string | undefined,
  config: OriginConfig,
): boolean => {
  if (!origin) return true;

  const allowedOrigins = Array.isArray(config.corsOrigin)
    ? config.corsOrigin
    : [config.corsOrigin];
  if (allowedOrigins.includes(origin)) return true;
  if (!config.allowLocalOrigins) return false;

  try {
    const parsedOrigin = new URL(origin);
    return (
      (parsedOrigin.hostname === "localhost" ||
        parsedOrigin.hostname === "127.0.0.1" ||
        parsedOrigin.hostname === "::1") &&
      (Number(parsedOrigin.port) >= 5173 ||
        [4173, 4174, 4175].includes(Number(parsedOrigin.port)))
    );
  } catch {
    return false;
  }
};
