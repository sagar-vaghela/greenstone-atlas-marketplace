import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../apps/api/src/auth/password.js";
import {
  clearSessionCookie,
  requireAuthenticatedUser,
  setSessionCookie,
} from "../apps/api/src/auth/middleware.js";
import { buildApp } from "../apps/api/src/app.js";
import { isOriginAllowed } from "../apps/api/src/http/origin.js";

describe("authentication utilities", () => {
  it("hashes passwords with a unique salt and verifies only the original", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");

    expect(first).not.toBe(second);
    expect(verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(verifyPassword("wrong password", first)).toBe(false);
    expect(verifyPassword("anything", "malformed")).toBe(false);
  });

  it("sets and clears the appropriate cookie attributes", () => {
    const values: string[] = [];
    const reply = {
      header: (name: string, value: string | string[]) => {
        expect(name).toBe("Set-Cookie");
        values.push(...(Array.isArray(value) ? value : [value]));
        return reply;
      },
    };

    setSessionCookie(reply as never, "session id", false);
    expect(values[0]).toContain("atlas_session=session%20id");
    expect(values[0]).toContain("SameSite=Lax");
    clearSessionCookie(reply as never, false);
    setSessionCookie(reply as never, "secure-session", true);
    clearSessionCookie(reply as never, true);
    expect(values).toContain(
      "atlas_session_partitioned=secure-session; Path=/; HttpOnly; SameSite=None; Max-Age=604800; Secure; Partitioned",
    );
    expect(values).toContain(
      "atlas_session_partitioned=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Secure; Partitioned",
    );
  });

  it("rejects unauthenticated requests and permits local development origins", () => {
    const send = (body: unknown) => {
      expect(body).toMatchObject({
        error: { code: "AUTHENTICATION_REQUIRED" },
      });
    };
    const reply = {
      status: (code: number) => {
        expect(code).toBe(401);
        return { send };
      },
    };

    expect(requireAuthenticatedUser({ user: null } as never, reply as never)).toBe(
      undefined,
    );
    expect(
      isOriginAllowed("http://localhost:5173", {
        corsOrigin: "https://market.example",
        allowLocalOrigins: true,
      }),
    ).toBe(true);
    expect(
      isOriginAllowed("http://localhost:5000", {
        corsOrigin: "https://market.example",
        allowLocalOrigins: true,
      }),
    ).toBe(false);
    expect(
      isOriginAllowed("not-an-origin", {
        corsOrigin: "https://market.example",
        allowLocalOrigins: true,
      }),
    ).toBe(false);
  });

  it("loads a user from a session cookie and ignores unknown sessions", async () => {
    const app = buildApp({ secureCookies: false });
    await app.ready();
    try {
      const login = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "buyer@example.com", password: "buyer123" },
      });
      expect(login.statusCode).toBe(200);
      const cookie = String(login.headers["set-cookie"]).split(";")[0];

      const authenticated = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie },
      });
      expect(authenticated.statusCode).toBe(200);
      expect(authenticated.json()).toMatchObject({
        id: "demo-buyer",
        email: "buyer@example.com",
      });

      const unknown = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie: "atlas_session=unknown" },
      });
      expect(unknown.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
