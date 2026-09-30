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
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Stack,
} from "@mui/material";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";
import { notificationClosed, selectRealtime } from "../../features/realtime/realtimeSlice";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import StorefrontIcon from "@mui/icons-material/Storefront";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import { fetchNotifications, fetchUnreadCount, selectNotificationState, selectNotifications } from "../../features/notifications/notificationsSlice";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const realtime = useAppSelector(selectRealtime);
  const notifications = useAppSelector(selectNotificationState);
  const latest = useAppSelector(selectNotifications).slice(0, 4);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ minWidth: 0, gap: { xs: 0.5, sm: 1 }, py: 1 }}>
          <Link component={RouterLink} to="/" color="inherit" underline="none">
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <StorefrontIcon fontSize="small" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 700, letterSpacing: "0.01em" }}>
                Atlas
              </Typography>
            </Stack>
          </Link>
          <Button component={RouterLink} to="/" color="inherit" startIcon={<StorefrontIcon />} sx={{ ml: { xs: "auto", sm: 3 } }}>
            Marketplace
          </Button>
          {user ? (
            <>
              <Button component={RouterLink} to="/transactions" color="inherit" sx={{ display: { xs: "none", md: "inline-flex" } }}>
                Transactions
              </Button>
              <Button component={RouterLink} to="/messages" color="inherit" startIcon={<MessageOutlinedIcon />} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                Messages
              </Button>
              <IconButton color="inherit" component={RouterLink} to="/messages" sx={{ display: { xs: "inline-flex", sm: "none" } }} aria-label="Messages">
                <MessageOutlinedIcon />
              </IconButton>
              <IconButton color="inherit" onClick={(event) => { setAnchorEl(event.currentTarget); void dispatch(fetchNotifications()); void dispatch(fetchUnreadCount()); }} aria-label={`Notifications, ${notifications.unreadCount} unread`}>
                <Badge badgeContent={notifications.unreadCount > 99 ? "99+" : notifications.unreadCount} color="secondary"><NotificationsNoneIcon /></Badge>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} slotProps={{ paper: { sx: { width: { xs: "calc(100vw - 24px)", sm: 360 }, maxWidth: 360 } } }}>
                {latest.length === 0 ? <MenuItem disabled>No notifications yet</MenuItem> : latest.map((notification) => <MenuItem key={notification.id} selected={!notification.readAt} onClick={() => { setAnchorEl(null); navigate("/notifications"); }}>{notification.title}</MenuItem>)}
                <Divider />
                <MenuItem onClick={() => { setAnchorEl(null); navigate("/notifications"); }}>View all notifications</MenuItem>
              </Menu>
              <Button component={RouterLink} to="/listings/new" color="secondary" variant="contained" startIcon={<AddIcon />} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                List a watch
              </Button>
              <IconButton color="inherit" component={RouterLink} to="/profile" aria-label="Open profile">
                <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", color: "primary.dark", fontSize: "0.9rem" }}>{user.displayName.slice(0, 1).toUpperCase()}</Avatar>
              </IconButton>
              <Button color="inherit" onClick={() => void dispatch(logout())} startIcon={<LogoutIcon />} sx={{ display: { xs: "none", md: "inline-flex" } }}>
                Logout
              </Button>
            </>
          ) : (
            <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
              <Button component={RouterLink} to="/login" color="inherit">
                Sign in
              </Button>
              <Button component={RouterLink} to="/register" color="secondary" variant="contained">
                Create account
              </Button>
            </Stack>
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
      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: { xs: 4, md: 7 } }}>
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
