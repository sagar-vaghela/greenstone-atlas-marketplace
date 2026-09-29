import type { User } from "@atlas/types";
import { request } from "./client";

export const fetchCurrentUser = (): Promise<User> => request<User>("/auth/me");
export const login = (input: {
  email: string;
  password: string;
}): Promise<User> =>
  request<User>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const register = (input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<User> =>
  request<User>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const logout = (): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>("/auth/logout", { method: "POST" });
