import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuthenticatedUser } from "../auth/middleware.js";
import type { NotificationRepository } from "../repositories/notification-repository.js";

interface Options { repository: NotificationRepository }
interface IdParams { id: string }
const paginationSchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(30), before: z.string().trim().min(1).optional() });
const error = (reply: { status: (code: number) => { send: (body: unknown) => unknown } }, status: number, code: string, message: string) => reply.status(status).send({ error: { code, message } });

export const registerNotificationRoutes = async (app: FastifyInstance, options: Options): Promise<void> => {
  app.get<{ Querystring: { limit?: string; before?: string } }>("/notifications", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) return error(reply, 400, "VALIDATION_ERROR", "Invalid notification pagination.");
    return options.repository.listForUser(user.id, parsed.data.limit, parsed.data.before);
  });

  app.get("/notifications/unread-count", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    return { unreadCount: await options.repository.countUnread(user.id) };
  });

  app.post<{ Params: IdParams }>("/notifications/:id/read", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const notification = await options.repository.markRead(request.params.id, user.id, new Date().toISOString());
    if (!notification) return error(reply, 404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    return { notification, unreadCount: await options.repository.countUnread(user.id) };
  });

  app.post("/notifications/read-all", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    if (!user) return;
    const readAt = new Date().toISOString();
    const updated = await options.repository.markAllRead(user.id, readAt);
    return { updated, unreadCount: 0 };
  });
};
