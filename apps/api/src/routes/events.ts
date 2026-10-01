import type { FastifyInstance } from "fastify";
import type { MarketplaceEvent } from "@atlas/types";
import { config } from "../config/index.js";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  const allowedOrigins = Array.isArray(config.corsOrigin)
    ? config.corsOrigin
    : [config.corsOrigin];
  if (allowedOrigins.includes(origin)) return true;

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

export const registerEventRoutes = async (
  app: FastifyInstance,
  eventBus: MarketplaceEventBus,
): Promise<void> => {
  app.get(
    "/events",
    {
      websocket: true,
      preValidation: async (request, reply) => {
        if (!requireAuthenticatedUser(request, reply)) return;
        if (!isAllowedOrigin(request.headers.origin)) {
          return reply.status(403).send({
            error: {
              code: "ORIGIN_NOT_ALLOWED",
              message: "WebSocket origin is not allowed.",
            },
          });
        }
      },
    },
    (socket, request) => {
      const user = request.user;
      if (!user) {
        socket.close(1008, "Authentication required");
        return;
      }

      const listener = (event: MarketplaceEvent) => {
        if (socket.readyState === 1) socket.send(JSON.stringify(event));
      };
      const unsubscribe = eventBus.subscribe(user.id, listener);
      const heartbeat = setInterval(() => {
        if (socket.readyState === 1) socket.ping();
      }, 25_000);
      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      socket.once("close", cleanup);
      socket.once("error", cleanup);
    },
  );
};