import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  clearSessionCookie,
  requireAuthenticatedUser,
  setSessionCookie,
} from "../auth/middleware.js";
import { loginSchema, registerSchema } from "@atlas/validation";
import type { FastifyInstance } from "fastify";
import type { SessionRepository } from "../repositories/session-repository.js";
import {
  normalizeEmail,
  toPublicUser,
  type UserRepository,
} from "../repositories/user-repository.js";

interface Options {
  users: UserRepository;
  sessions: SessionRepository;
  secureCookies: boolean;
  sessionTtlMs: number;
}
const authError = (
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  code: number,
  errorCode: string,
  message: string,
) => reply.status(code).send({ error: { code: errorCode, message } });

export const registerAuthRoutes = async (
  app: FastifyInstance,
  options: Options,
): Promise<void> => {
  app.post<{ Body: unknown }>("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success)
      return authError(
        reply,
        400,
        "VALIDATION_ERROR",
        "Please enter valid registration details.",
      );
    if (await options.users.findByEmail(parsed.data.email))
      return authError(
        reply,
        409,
        "EMAIL_ALREADY_REGISTERED",
        "That email is already registered.",
      );
    const user = await options.users.create({
      ...parsed.data,
      email: normalizeEmail(parsed.data.email),
      passwordHash: hashPassword(parsed.data.password),
    });
    const session = await options.sessions.create(
      user.id,
      new Date(Date.now() + options.sessionTtlMs).toISOString(),
    );
    setSessionCookie(reply, session.id, options.secureCookies);
    return reply.status(201).send(toPublicUser(user));
  });
  app.post<{ Body: unknown }>("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success)
      return authError(
        reply,
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    const user = await options.users.findByEmail(parsed.data.email);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash))
      return authError(
        reply,
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    const session = await options.sessions.create(
      user.id,
      new Date(Date.now() + options.sessionTtlMs).toISOString(),
    );
    setSessionCookie(reply, session.id, options.secureCookies);
    return toPublicUser(user);
  });
  app.post("/auth/logout", async (request, reply) => {
    if (request.sessionId) await options.sessions.delete(request.sessionId);
    clearSessionCookie(reply, options.secureCookies);
    return { ok: true };
  });
  app.get("/auth/me", async (request, reply) => {
    const user = requireAuthenticatedUser(request, reply);
    return user;
  });
};
