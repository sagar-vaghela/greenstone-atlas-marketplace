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
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { fetchCurrentUser, selectAuth } from "./features/auth/authSlice";
import { CircularProgress, Box } from "@mui/material";

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
  useEffect(() => {
    void dispatch(fetchCurrentUser());
  }, [dispatch]);
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
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
