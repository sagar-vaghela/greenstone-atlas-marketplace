import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Listing } from "@atlas/types";
import { ApiError } from "../../api/client";
import { getListingById, getListings } from "../../api/listings";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface ListingsState {
  items: Listing[];
  selectedListing: Listing | null;
  listStatus: RequestStatus;
  detailStatus: RequestStatus;
  error: string | null;
  detailRequestId: string | null;
}

const initialState: ListingsState = {
  items: [],
  selectedListing: null,
  listStatus: "idle",
  detailStatus: "idle",
  error: null,
  detailRequestId: null,
};

export const fetchListings = createAsyncThunk<
  Listing[],
  void,
  { rejectValue: string }
>("listings/fetchListings", async (_, { rejectWithValue }) => {
  try {
    return await getListings();
  } catch {
    return rejectWithValue("Unable to load listings.");
  }
});

export const fetchListingById = createAsyncThunk<
  Listing,
  string,
  { rejectValue: string }
>("listings/fetchListingById", async (id, { rejectWithValue }) => {
  try {
    return await getListingById(id);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return rejectWithValue("Listing not found");
    }

    return rejectWithValue("Unable to load this listing. Please try again.");
  }
});

const listingsSlice = createSlice({
  name: "listings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchListings.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.payload ?? "Unable to load listings.";
      })
      .addCase(fetchListingById.pending, (state, action) => {
        state.detailStatus = "loading";
        state.detailRequestId = action.meta.requestId;
        state.selectedListing = null;
        state.error = null;
      })
      .addCase(fetchListingById.fulfilled, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "succeeded";
        state.selectedListing = action.payload;
        state.error = null;
      })
      .addCase(fetchListingById.rejected, (state, action) => {
        if (state.detailRequestId !== action.meta.requestId) {
          return;
        }

        state.detailStatus = "failed";
        state.error =
          action.payload ?? "Unable to load this listing. Please try again.";
      });
  },
});

export const selectListings = (state: { listings: ListingsState }) =>
  state.listings.items;
export const selectSelectedListing = (state: { listings: ListingsState }) =>
  state.listings.selectedListing;
export const selectListStatus = (state: { listings: ListingsState }) =>
  state.listings.listStatus;
export const selectDetailStatus = (state: { listings: ListingsState }) =>
  state.listings.detailStatus;
export const selectListingsError = (state: { listings: ListingsState }) =>
  state.listings.error;

export default listingsSlice.reducer;
