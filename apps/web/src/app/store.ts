import { configureStore } from "@reduxjs/toolkit";
import listingsReducer from "../features/listings/listingsSlice";
import offersReducer from "../features/offers/offersSlice";
import authReducer from "../features/auth/authSlice";

export const store = configureStore({
  reducer: {
    listings: listingsReducer,
    offers: offersReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
