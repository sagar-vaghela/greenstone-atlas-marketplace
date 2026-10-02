import type { User } from "@atlas/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "../repositories/session-repository.js";
import {
  toPublicUser,
  type UserRepository,
} from "../repositories/user-repository.js";

export const SESSION_COOKIE = "atlas_session";
const PARTITIONED_SESSION_COOKIE = `${SESSION_COOKIE}_partitioned`;
const readCookie = (request: FastifyRequest): string | undefined => {
  const cookies = request.headers.cookie
    ?.split(";")
    .map((item) => item.trim());
  const partitionedCookie = cookies?.find((item) =>
    item.startsWith(`${PARTITIONED_SESSION_COOKIE}=`),
  );
  const legacyCookie = cookies?.find((item) =>
    item.startsWith(`${SESSION_COOKIE}=`),
  );
  const cookie = partitionedCookie ?? legacyCookie;
  const cookieName = partitionedCookie
    ? PARTITIONED_SESSION_COOKIE
    : SESSION_COOKIE;
  return cookie?.slice(cookieName.length + 1);
};

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
  const cookieName = secure ? PARTITIONED_SESSION_COOKIE : SESSION_COOKIE;
  reply.header(
    "Set-Cookie",
    `${cookieName}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=604800${secure ? "; Secure; Partitioned" : ""}`,
  );
};

export const clearSessionCookie = (
  reply: FastifyReply,
  secure: boolean,
): void => {
  const sameSite = secure ? "None" : "Lax";
  const expiredCookie = (cookieName: string) =>
    `${cookieName}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure ? "; Secure" : ""}`;
  reply.header(
    "Set-Cookie",
    secure
      ? [
          `${expiredCookie(PARTITIONED_SESSION_COOKIE)}; Partitioned`,
          expiredCookie(SESSION_COOKIE),
        ]
      : expiredCookie(SESSION_COOKIE),
  );
};
