import { configureStore } from "@reduxjs/toolkit";
import listingsReducer from "../features/listings/listingsSlice";
import offersReducer from "../features/offers/offersSlice";
import authReducer from "../features/auth/authSlice";
import sellerReducer from "../features/sellers/sellerSlice";

export const store = configureStore({
  reducer: {
    listings: listingsReducer,
    offers: offersReducer,
    auth: authReducer,
    sellers: sellerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
