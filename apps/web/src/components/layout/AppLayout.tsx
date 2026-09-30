import {
  AppBar,
  Box,
  Button,
  Container,
  Link,
  Toolbar,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";
import { notificationClosed, selectRealtime } from "../../features/realtime/realtimeSlice";

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const realtime = useAppSelector(selectRealtime);
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ minWidth: 0, overflowX: "auto", flexWrap: { xs: "wrap", sm: "nowrap" }, gap: { xs: 0.25, sm: 1 } }}>
          <Link component={RouterLink} to="/" color="inherit" underline="none">
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              Atlas Marketplace
            </Typography>
          </Link>
          <Button component={RouterLink} to="/" color="inherit" sx={{ ml: "auto" }}>
            Marketplace
          </Button>
          {user ? (
            <>
              <Button component={RouterLink} to="/transactions" color="inherit">
                Transactions
              </Button>
              <Button component={RouterLink} to="/messages" color="inherit">
                Messages
              </Button>
              <Button component={RouterLink} to="/listings/new" color="inherit">
                Create listing
              </Button>
              <Typography
                variant="body2"
                sx={{ ml: 2, display: { xs: "none", sm: "block" } }}
              >
                {user.displayName}
              </Typography>
              <Button component={RouterLink} to="/profile" color="inherit">
                Profile
              </Button>
              <Button color="inherit" onClick={() => void dispatch(logout())}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/login" color="inherit">
                Sign in
              </Button>
              <Button component={RouterLink} to="/register" color="inherit">
                Create account
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      {user && (
        <Box sx={{ px: 2, py: 0.75, textAlign: "center", bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary" role="status">
            {realtime.connectionStatus === "connected"
              ? "Live updates connected"
              : realtime.connectionStatus === "reconnecting"
                ? "Reconnecting to live updates..."
                : "Connecting to live updates..."}
          </Typography>
        </Box>
      )}
      <Container component="main" maxWidth="md" sx={{ flex: 1, py: 6 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Atlas Marketplace
        </Typography>
      </Box>
      <Snackbar
        open={Boolean(realtime.notification)}
        autoHideDuration={5000}
        onClose={() => dispatch(notificationClosed())}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => dispatch(notificationClosed())} severity={realtime.notification?.severity} role="status">
          {realtime.notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
