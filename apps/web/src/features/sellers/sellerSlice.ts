import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Listing, SellerProfileResponse } from "@atlas/types";
import { ApiError } from "../../api/client";
import * as sellerApi from "../../api/sellers";
import type { RequestStatus } from "../listings/listingsSlice";

interface SellerState {
  selectedSeller: SellerProfileResponse | null;
  selectedSellerStatus: RequestStatus;
  selectedSellerError: string | null;
  sellerListings: Listing[];
  sellerListingsStatus: RequestStatus;
  sellerListingsError: string | null;
  currentSellerProfile: SellerProfileResponse | null;
  currentProfileStatus: RequestStatus;
  updateStatus: RequestStatus;
  updateError: string | null;
  profileRequestId: string | null;
  listingsRequestId: string | null;
}

const initialState: SellerState = {
  selectedSeller: null,
  selectedSellerStatus: "idle",
  selectedSellerError: null,
  sellerListings: [],
  sellerListingsStatus: "idle",
  sellerListingsError: null,
  currentSellerProfile: null,
  currentProfileStatus: "idle",
  updateStatus: "idle",
  updateError: null,
  profileRequestId: null,
  listingsRequestId: null,
};

const message = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status === 404
    ? "This seller profile is no longer available."
    : fallback;

export const fetchSellerProfile = createAsyncThunk<
  SellerProfileResponse,
  string,
  { rejectValue: string }
>("sellers/fetchProfile", async (sellerId, { rejectWithValue }) => {
  try {
    return await sellerApi.getSellerProfile(sellerId);
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to load this seller profile."),
    );
  }
});

export const fetchSellerListings = createAsyncThunk<
  Listing[],
  string,
  { rejectValue: string }
>("sellers/fetchListings", async (sellerId, { rejectWithValue }) => {
  try {
    return await sellerApi.getSellerListings(sellerId);
  } catch {
    return rejectWithValue("Unable to load this seller's active listings.");
  }
});

export const fetchCurrentSellerProfile = createAsyncThunk<
  SellerProfileResponse,
  void,
  { rejectValue: string }
>("sellers/fetchCurrentProfile", async (_, { rejectWithValue }) => {
  try {
    return await sellerApi.getCurrentSellerProfile();
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to load your seller profile."),
    );
  }
});

export const updateSellerProfile = createAsyncThunk<
  SellerProfileResponse,
  { displayName?: string; bio?: string; location?: string },
  { rejectValue: string }
>("sellers/updateProfile", async (input, { rejectWithValue }) => {
  try {
    return await sellerApi.updateSellerProfile(input);
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError && error.status === 400
        ? "Please check your profile details."
        : "Unable to save your profile. Please try again.",
    );
  }
});

const sellerSlice = createSlice({
  name: "sellers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSellerProfile.pending, (state, action) => {
        state.selectedSellerStatus = "loading";
        state.selectedSeller = null;
        state.selectedSellerError = null;
        state.profileRequestId = action.meta.requestId;
      })
      .addCase(fetchSellerProfile.fulfilled, (state, action) => {
        if (state.profileRequestId !== action.meta.requestId) return;
        state.selectedSellerStatus = "succeeded";
        state.selectedSeller = action.payload;
      })
      .addCase(fetchSellerProfile.rejected, (state, action) => {
        if (state.profileRequestId !== action.meta.requestId) return;
        state.selectedSellerStatus = "failed";
        state.selectedSellerError =
          action.payload ?? "Unable to load this seller profile.";
      })
      .addCase(fetchSellerListings.pending, (state, action) => {
        state.sellerListingsStatus = "loading";
        state.sellerListings = [];
        state.sellerListingsError = null;
        state.listingsRequestId = action.meta.requestId;
      })
      .addCase(fetchSellerListings.fulfilled, (state, action) => {
        if (state.listingsRequestId !== action.meta.requestId) return;
        state.sellerListingsStatus = "succeeded";
        state.sellerListings = action.payload;
      })
      .addCase(fetchSellerListings.rejected, (state, action) => {
        if (state.listingsRequestId !== action.meta.requestId) return;
        state.sellerListingsStatus = "failed";
        state.sellerListingsError =
          action.payload ?? "Unable to load this seller's active listings.";
      })
      .addCase(fetchCurrentSellerProfile.pending, (state) => {
        state.currentProfileStatus = "loading";
      })
      .addCase(fetchCurrentSellerProfile.fulfilled, (state, action) => {
        state.currentProfileStatus = "succeeded";
        state.currentSellerProfile = action.payload;
      })
      .addCase(fetchCurrentSellerProfile.rejected, (state, action) => {
        state.currentProfileStatus = "failed";
        state.updateError =
          action.payload ?? "Unable to load your seller profile.";
      })
      .addCase(updateSellerProfile.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateSellerProfile.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        state.currentSellerProfile = action.payload;
        state.updateError = null;
      })
      .addCase(updateSellerProfile.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError =
          action.payload ?? "Unable to save your profile. Please try again.";
      });
  },
});

export const selectSellerState = (state: { sellers: SellerState }) =>
  state.sellers;
export const selectSelectedSeller = (state: { sellers: SellerState }) =>
  state.sellers.selectedSeller;
export default sellerSlice.reducer;
