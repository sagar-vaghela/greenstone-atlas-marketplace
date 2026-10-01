// @vitest-environment jsdom
import { Provider } from "react-redux";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { store } from "./app/store";
import * as authApi from "./api/auth";

vi.mock("./api/auth", () => ({
  fetchCurrentUser: vi.fn().mockRejectedValue(new Error("Unauthorized")),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("protected routes", () => {
  it("redirects unauthenticated users to login after checking their session", async () => {
    window.history.replaceState({}, "", "/transactions");
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Welcome back" }),
      ).toBeTruthy();
    });
    expect(authApi.fetchCurrentUser).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("?returnTo=%2Ftransactions");
  });
});