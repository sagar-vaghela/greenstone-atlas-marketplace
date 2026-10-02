// @vitest-environment jsdom
import { Provider } from "react-redux";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { store } from "./app/store";
import * as authApi from "./api/auth";
import { ApiError } from "./api/client";

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
  it("keeps protected content and signed-out header hidden while restoring a session", async () => {
    vi.mocked(authApi.fetchCurrentUser)
      .mockRejectedValueOnce(
        new ApiError("Marketplace temporarily unavailable.", 503),
      )
      .mockResolvedValueOnce({
        id: "demo-buyer",
        email: "buyer@example.com",
        displayName: "Buyer",
        role: "buyer",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
    window.history.replaceState({}, "", "/transactions");
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(screen.getByLabelText("Checking your session")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(
      await screen.findByText("Marketplace temporarily unavailable."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Welcome back" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("link", { name: "Notifications, 0 unread" }),
    ).toBeTruthy();
  });

  it("redirects unauthenticated users to login after checking their session", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockRejectedValueOnce(
      new ApiError("Unauthorized", 401),
    );
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