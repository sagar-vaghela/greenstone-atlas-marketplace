import type { FastifyInstance } from "fastify";
import type { MarketplaceEvent } from "@atlas/types";
import { config } from "../config/index.js";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";
import { isOriginAllowed } from "../http/origin.js";

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
        if (!isOriginAllowed(request.headers.origin, config)) {
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
