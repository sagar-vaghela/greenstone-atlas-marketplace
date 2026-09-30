import { configureStore } from "@reduxjs/toolkit";
import listingsReducer from "../features/listings/listingsSlice";
import offersReducer from "../features/offers/offersSlice";
import authReducer from "../features/auth/authSlice";
import sellerReducer from "../features/sellers/sellerSlice";
import realtimeReducer from "../features/realtime/realtimeSlice";
import transactionsReducer from "../features/transactions/transactionsSlice";
import messagingReducer from "../features/messaging/messagingSlice";
import notificationsReducer from "../features/notifications/notificationsSlice";

export const store = configureStore({
  reducer: {
    listings: listingsReducer,
    offers: offersReducer,
    auth: authReducer,
    sellers: sellerReducer,
    realtime: realtimeReducer,
    transactions: transactionsReducer,
    messaging: messagingReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
