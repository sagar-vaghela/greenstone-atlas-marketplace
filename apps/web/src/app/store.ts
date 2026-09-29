import { configureStore } from "@reduxjs/toolkit";
import listingsReducer from "../features/listings/listingsSlice";
import offersReducer from "../features/offers/offersSlice";

export const store = configureStore({
  reducer: {
    listings: listingsReducer,
    offers: offersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
