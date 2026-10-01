import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { fetchCurrentUser, selectAuth } from "./features/auth/authSlice";
import { CircularProgress, Box } from "@mui/material";
import { connectMarketplaceEvents } from "./api/marketplaceEvents";
import { connectionStatusChanged, eventReceived, selectRealtime } from "./features/realtime/realtimeSlice";
import {
  transactionEventReceived,
} from "./features/transactions/transactionsSlice";
import { messageEventReceived } from "./features/messaging/messagingSlice";
import { fetchNotifications, fetchUnreadCount, notificationEventReceived } from "./features/notifications/notificationsSlice";

const MarketplacePage = lazy(() => import("./pages/MarketplacePage").then((module) => ({ default: module.MarketplacePage })));
const CreateListingPage = lazy(() => import("./pages/CreateListingPage").then((module) => ({ default: module.CreateListingPage })));
const EditListingPage = lazy(() => import("./pages/EditListingPage").then((module) => ({ default: module.EditListingPage })));
const ListingDetailsPage = lazy(() => import("./pages/ListingDetailsPage").then((module) => ({ default: module.ListingDetailsPage })));
const SellerProfilePage = lazy(() => import("./pages/SellerProfilePage").then((module) => ({ default: module.SellerProfilePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage").then((module) => ({ default: module.TransactionsPage })));
const TransactionDetailsPage = lazy(() => import("./pages/TransactionDetailsPage").then((module) => ({ default: module.TransactionDetailsPage })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const ConversationPage = lazy(() => import("./pages/ConversationPage").then((module) => ({ default: module.ConversationPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function RouteLoadingFallback() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
      <CircularProgress aria-label="Loading marketplace route" />
    </Box>
  );
}

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

export function App() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const connectionStatus = useAppSelector(selectRealtime).connectionStatus;
  useEffect(() => {
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
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
