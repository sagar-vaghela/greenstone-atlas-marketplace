import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Offer } from "@atlas/types";
import { ApiError } from "../../api/client";
import { counterOffer as counterOfferRequest, createOffer as createOfferRequest, getOffersForListing, updateOfferStatus } from "../../api/offers";
import { getCurrentUser } from "../../auth/demo-user";
import type { RequestStatus } from "../listings/listingsSlice";

interface OffersState { items: Offer[]; listStatus: RequestStatus; mutationStatus: RequestStatus; error: string | null; mutationError: string | null; requestId: string | null; }
const initialState: OffersState = { items: [], listStatus: "idle", mutationStatus: "idle", error: null, mutationError: null, requestId: null };
const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;
export const fetchOffers = createAsyncThunk<Offer[], string, { rejectValue: string }>("offers/fetch", async (listingId, { rejectWithValue }) => { try { return await getOffersForListing(listingId); } catch (error) { return rejectWithValue(message(error, "Unable to load offers.")); } });
export const createOffer = createAsyncThunk<Offer, { listingId: string; amount: number; currency: string; parentOfferId?: string }, { rejectValue: string }>("offers/create", async ({ listingId, amount, currency, parentOfferId }, { rejectWithValue }) => { try { return await createOfferRequest(listingId, { buyerId: getCurrentUser("buyer").id, amount, currency, parentOfferId }); } catch (error) { return rejectWithValue(message(error, "Unable to submit your offer.")); } });
export const offerAction = createAsyncThunk<Offer, { id: string; status: "accepted" | "rejected" | "withdrawn"; role: "buyer" | "seller" }, { rejectValue: string }>("offers/action", async (input, { rejectWithValue }) => { try { return await updateOfferStatus(input.id, input.status, input.role); } catch (error) { return rejectWithValue(message(error, "Unable to update this offer.")); } });
export const counterOffer = createAsyncThunk<Offer, { id: string; amount: number; currency: string }, { rejectValue: string }>("offers/counter", async ({ id, amount, currency }, { rejectWithValue }) => { try { return await counterOfferRequest(id, { amount, currency }); } catch (error) { return rejectWithValue(message(error, "Unable to send the counter-offer.")); } });
const offersSlice = createSlice({
  name: "offers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOffers.pending, (state, action) => {
        state.listStatus = "loading";
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.listStatus = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.listStatus = "failed";
        state.error = action.payload ?? "Unable to load offers.";
      })
      .addCase(createOffer.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(createOffer.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.items.push(action.payload);
      })
      .addCase(createOffer.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload ?? "Unable to submit your offer.";
      })
      .addCase(offerAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(offerAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(offerAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload ?? "Unable to update this offer.";
      })
      .addCase(counterOffer.pending, (state) => {
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addCase(counterOffer.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        state.items.push(action.payload);
      })
      .addCase(counterOffer.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload ?? "Unable to send the counter-offer.";
      });
  },
});
export const selectOffers = (state: { offers: OffersState }) => state.offers.items;
export const selectOffersStatus = (state: { offers: OffersState }) => state.offers.listStatus;
export const selectOffersError = (state: { offers: OffersState }) => state.offers.error;
export const selectOfferMutationStatus = (state: { offers: OffersState }) => state.offers.mutationStatus;
export const selectOfferMutationError = (state: { offers: OffersState }) => state.offers.mutationError;
export default offersSlice.reducer;