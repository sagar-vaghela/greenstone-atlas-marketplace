import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { CreateListingPage } from "./pages/CreateListingPage";
import { EditListingPage } from "./pages/EditListingPage";
import { ListingDetailsPage } from "./pages/ListingDetailsPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SellerProfilePage } from "./pages/SellerProfilePage";
import { ProfilePage } from "./pages/ProfilePage";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { fetchCurrentUser, selectAuth } from "./features/auth/authSlice";
import { CircularProgress, Box } from "@mui/material";
import { connectMarketplaceEvents } from "./api/marketplaceEvents";
import { connectionStatusChanged, eventReceived, selectRealtime } from "./features/realtime/realtimeSlice";
import {
  transactionEventReceived,
} from "./features/transactions/transactionsSlice";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TransactionDetailsPage } from "./pages/TransactionDetailsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ConversationPage } from "./pages/ConversationPage";
import { messageEventReceived } from "./features/messaging/messagingSlice";
import { fetchNotifications, fetchUnreadCount, notificationEventReceived } from "./features/notifications/notificationsSlice";
import { NotificationsPage } from "./pages/NotificationsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const auth = useAppSelector(selectAuth);
  if (!auth.initialized)
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <CircularProgress aria-label="Checking your session" />
      </Box>
    );
  return auth.user ? (
    children
  ) : (
    <Navigate
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
      replace
    />
  );
}

const hasActiveSessionCookie = () =>
  document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("atlas_session="));

export function App() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const connectionStatus = useAppSelector(selectRealtime).connectionStatus;
  useEffect(() => {
    if (!hasActiveSessionCookie()) {
      return;
    }
    void dispatch(fetchCurrentUser());
  }, [dispatch]);
  useEffect(() => {
    if (!user) {
      dispatch(connectionStatusChanged("disconnected"));
      return;
    }
    return connectMarketplaceEvents(
      (event) => {
        dispatch(eventReceived({ event, userId: user.id }));
        if (event.type === "notification.created") dispatch(notificationEventReceived({ event }));
        if (event.type.startsWith("transaction.") && "transaction" in event.payload) {
          dispatch(transactionEventReceived({ transaction: event.payload.transaction }));
        }
        if (event.type === "message.created" || event.type === "conversation.read") {
          dispatch(messageEventReceived({ event, userId: user.id }));
        }
      },
      (status) => dispatch(connectionStatusChanged(status)),
    );
  }, [dispatch, user]);
  useEffect(() => {
    if (!user) return;
    void dispatch(fetchNotifications());
    void dispatch(fetchUnreadCount());
  }, [dispatch, user]);
  useEffect(() => {
    if (user && connectionStatus === "connected") void dispatch(fetchUnreadCount());
  }, [connectionStatus, dispatch, user]);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/listings/new"
            element={
              <ProtectedRoute>
                <CreateListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listings/:id/edit"
            element={
              <ProtectedRoute>
                <EditListingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/listings/:id" element={<ListingDetailsPage />} />
          <Route path="/sellers/:sellerId" element={<SellerProfilePage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <ProtectedRoute>
                <TransactionDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={<ProtectedRoute><MessagesPage /></ProtectedRoute>}
          />
          <Route
            path="/messages/:conversationId"
            element={<ProtectedRoute><ConversationPage /></ProtectedRoute>}
          />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
