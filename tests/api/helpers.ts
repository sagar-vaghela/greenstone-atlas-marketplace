import type { FastifyInstance, InjectOptions } from "fastify";
import { expect } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";

export const makeApp = async (): Promise<FastifyInstance> => {
  const app = buildApp({ secureCookies: false });
  await app.ready();
  return app;
};

export const cookieFrom = (response: { headers: Record<string, unknown> }): string => {
  const value = response.headers["set-cookie"];
  const cookie = Array.isArray(value) ? value[0] : value;
  return String(cookie).split(";")[0];
};

export const inject = (app: FastifyInstance, options: InjectOptions, cookie?: string) =>
  app.inject({ ...options, headers: { ...options.headers, ...(cookie ? { cookie } : {}) } });

export const login = async (app: FastifyInstance, email: string, password: string): Promise<string> => {
  const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password } });
  expect(response.statusCode).toBe(200);
  return cookieFrom(response);
};

export const register = async (app: FastifyInstance, email: string): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, displayName: "New User", password: "password123" },
  });
  expect(response.statusCode).toBe(201);
  return cookieFrom(response);
};