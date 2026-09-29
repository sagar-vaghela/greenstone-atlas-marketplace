import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { User } from "@atlas/types";
import { ApiError } from "../../api/client";
import * as authApi from "../../api/auth";

type AuthStatus = "idle" | "loading" | "succeeded" | "failed";
interface AuthState {
  user: User | null;
  status: AuthStatus;
  initialized: boolean;
  error: string | null;
}
const initialState: AuthState = {
  user: null,
  status: "idle",
  initialized: false,
  error: null,
};
const message = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/currentUser", async (_, { rejectWithValue }) => {
  try {
    return await authApi.fetchCurrentUser();
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError && error.status === 401
        ? ""
        : message(error, "Unable to restore your session."),
    );
  }
});
export const login = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async (input, { rejectWithValue }) => {
  try {
    return await authApi.login(input);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to sign in."));
  }
});
export const register = createAsyncThunk<
  User,
  { email: string; displayName: string; password: string },
  { rejectValue: string }
>("auth/register", async (input, { rejectWithValue }) => {
  try {
    return await authApi.register(input);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to create your account."));
  }
});
export const logout = createAsyncThunk("auth/logout", async () => {
  await authApi.logout();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.status = "succeeded";
        state.initialized = true;
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to sign in.";
      })
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to create your account.";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = "succeeded";
        state.initialized = true;
        state.error = null;
      });
  },
});
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.user;
export default authSlice.reducer;
