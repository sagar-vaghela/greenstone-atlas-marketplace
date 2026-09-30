// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import authReducer from "../features/auth/authSlice";
import { LoginPage } from "./LoginPage";

vi.mock("../api/auth", () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

const renderLogin = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(<Provider store={store}><BrowserRouter><LoginPage /></BrowserRouter></Provider>);
};

describe("login form", () => {
  it("reports required and email validation before submitting", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    const email = screen.getByRole("textbox", { name: "Email" });
    expect((email as HTMLInputElement).checkValidity()).toBe(false);
    fireEvent.change(email, { target: { value: "invalid" } });
    fireEvent.change(screen.getByDisplayValue(""), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((email as HTMLInputElement).checkValidity()).toBe(false);
  });
});