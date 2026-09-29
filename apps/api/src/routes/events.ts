import type { FastifyInstance } from "fastify";
import type { MarketplaceEvent } from "@atlas/types";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { MarketplaceEventBus } from "../events/marketplace-event-bus.js";

export const registerEventRoutes = async (
  app: FastifyInstance,
  eventBus: MarketplaceEventBus,
): Promise<void> => {
  app.get("/events", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;

    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": request.headers.origin ?? "",
      "Access-Control-Allow-Credentials": "true",
    });
    response.write(": connected\n\n");

    const listener = (event: MarketplaceEvent) => {
      response.write(`event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
    };
    const unsubscribe = eventBus.subscribe(user.id, listener);
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25_000);
    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
    request.raw.once("close", cleanup);
    response.once("close", cleanup);
  });
};