import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CreateListingInput,
  Listing,
  ListingQuery,
  ListingStatus,
  UpdateListingInput,
} from "@atlas/types";
import { ApiError } from "../../api/client";
import {
  createListing as createListingRequest,
  getListingById,
  getListings,
  updateListing as updateListingRequest,
  updateListingStatus as updateListingStatusRequest,
} from "../../api/listings";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface ListingsState {
  items: Listing[];
  selectedListing: Listing | null;
  listStatus: RequestStatus;
  detailStatus: RequestStatus;
  createStatus: RequestStatus;
  updateStatus: RequestStatus;
  error: string | null;
  createError: string | null;
  updateError: string | null;
  statusUpdateStatus: RequestStatus;
  statusUpdateError: string | null;
  detailRequestId: string | null;
}

const initialState: ListingsState = {
  items: [],
  selectedListing: null,
  listStatus: "idle",
  detailStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  error: null,
  createError: null,
  updateError: null,
  statusUpdateStatus: "idle",
  statusUpdateError: null,
  detailRequestId: null,
};

export const fetchListings = createAsyncThunk<
  Listing[],
  ListingQuery | undefined,
  { rejectValue: string }
>("listings/fetchListings", async (query, { rejectWithValue }) => {
  try {
    return await getListings(query);
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

export const createListing = createAsyncThunk<
  Listing,
  CreateListingInput,
  { rejectValue: string }
>("listings/createListing", async (input, { rejectWithValue }) => {
  try {
    return await createListingRequest(input);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 400) {
      return rejectWithValue("Please check the listing details and try again.");
    }

    return rejectWithValue("Unable to create this listing. Please try again.");
  }
});

export const updateListing = createAsyncThunk<
  Listing,
  { id: string; input: UpdateListingInput },
  { rejectValue: string }
>("listings/updateListing", async ({ id, input }, { rejectWithValue }) => {
  try {
    return await updateListingRequest(id, input);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 400) {
      return rejectWithValue("Please check the listing details and try again.");
    }
    if (error instanceof ApiError && error.status === 404) {
      return rejectWithValue("Listing not found");
    }

    return rejectWithValue("Unable to update this listing. Please try again.");
  }
});

export const updateListingStatus = createAsyncThunk<
  Listing,
  { id: string; status: ListingStatus },
  { rejectValue: string }
>("listings/updateListingStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    return await updateListingStatusRequest(id, status);
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return rejectWithValue("Listing not found");
    }
    if (error instanceof ApiError && error.status === 409) {
      return rejectWithValue("This listing status can no longer be changed.");
    }
    if (error instanceof ApiError && error.status === 400) {
      return rejectWithValue("Please choose a valid listing status.");
    }

    return rejectWithValue("Unable to update the listing status. Please try again.");
  }
});

const listingsSlice = createSlice({
  name: "listings",
  initialState,
  reducers: {
    resetCreateState: (state) => {
      state.createStatus = "idle";
      state.createError = null;
    },
    resetUpdateState: (state) => {
      state.updateStatus = "idle";
      state.updateError = null;
    },
  },
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
      })
      .addCase(createListing.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createListing.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.createError = null;
        state.items.push(action.payload);
      })
      .addCase(createListing.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError =
          action.payload ?? "Unable to create this listing. Please try again.";
      })
      .addCase(updateListing.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateListing.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        state.updateError = null;
        const index = state.items.findIndex(
          (listing) => listing.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedListing?.id === action.payload.id) {
          state.selectedListing = action.payload;
        }
      })
      .addCase(updateListing.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError =
          action.payload ?? "Unable to update this listing. Please try again.";
      })
      .addCase(updateListingStatus.pending, (state) => {
        state.statusUpdateStatus = "loading";
        state.statusUpdateError = null;
      })
      .addCase(updateListingStatus.fulfilled, (state, action) => {
        state.statusUpdateStatus = "succeeded";
        state.statusUpdateError = null;
        const index = state.items.findIndex(
          (listing) => listing.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedListing?.id === action.payload.id) {
          state.selectedListing = action.payload;
        }
      })
      .addCase(updateListingStatus.rejected, (state, action) => {
        state.statusUpdateStatus = "failed";
        state.statusUpdateError =
          action.payload ?? "Unable to update the listing status. Please try again.";
      });
  },
});

export const { resetCreateState, resetUpdateState } = listingsSlice.actions;

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
export const selectCreateStatus = (state: { listings: ListingsState }) =>
  state.listings.createStatus;
export const selectCreateError = (state: { listings: ListingsState }) =>
  state.listings.createError;
export const selectUpdateStatus = (state: { listings: ListingsState }) =>
  state.listings.updateStatus;
export const selectUpdateError = (state: { listings: ListingsState }) =>
  state.listings.updateError;
export const selectStatusUpdateStatus = (state: { listings: ListingsState }) =>
  state.listings.statusUpdateStatus;
export const selectStatusUpdateError = (state: { listings: ListingsState }) =>
  state.listings.statusUpdateError;

export default listingsSlice.reducer;
