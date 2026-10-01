import type { User } from "@atlas/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "../repositories/session-repository.js";
import {
  toPublicUser,
  type UserRepository,
} from "../repositories/user-repository.js";

export const SESSION_COOKIE = "atlas_session";
const readCookie = (request: FastifyRequest): string | undefined =>
  request.headers.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    sessionId: string | null;
  }
}

export const registerAuthentication = (
  app: FastifyInstance,
  users: UserRepository,
  sessions: SessionRepository,
): void => {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionId", null);
  app.addHook("onRequest", async (request) => {
    const sessionId = readCookie(request);
    if (!sessionId) return;
    const session = await sessions.findById(sessionId);
    const user = session ? await users.findById(session.userId) : undefined;
    if (session && user) {
      request.sessionId = session.id;
      request.user = toPublicUser(user);
    }
  });
};

export const requireAuthenticatedUser = (
  request: FastifyRequest,
  reply: FastifyReply,
): User | undefined => {
  if (!request.user) {
    void reply.status(401).send({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please sign in to continue.",
      },
    });
    return undefined;
  }
  return request.user;
};

export const setSessionCookie = (
  reply: FastifyReply,
  sessionId: string,
  secure: boolean,
): void => {
  const sameSite = secure ? "None" : "Lax";
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=604800${secure ? "; Secure" : ""}`,
  );
};

export const clearSessionCookie = (
  reply: FastifyReply,
  secure: boolean,
): void => {
  const sameSite = secure ? "None" : "Lax";
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure ? "; Secure" : ""}`,
  );
};
