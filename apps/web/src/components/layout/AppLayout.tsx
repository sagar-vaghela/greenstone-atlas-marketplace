import { useEffect, useState } from "react";
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout, selectCurrentUser } from "../../features/auth/authSlice";
import { selectConversations } from "../../features/messaging/messagingSlice";
import {
  notificationClosed,
  selectRealtime,
} from "../../features/realtime/realtimeSlice";
import {
  fetchNotifications,
  fetchUnreadCount,
  selectNotificationState,
  selectNotifications,
} from "../../features/notifications/notificationsSlice";

const navigationGroups = [
  {
    label: "Browse",
    items: [{ label: "Marketplace", to: "/", icon: <StorefrontIcon /> }],
  },
  {
    label: "Workspace",
    items: [
      { label: "Messages", to: "/messages", icon: <MessageOutlinedIcon /> },
      {
        label: "Notifications",
        to: "/notifications",
        icon: <NotificationsNoneIcon />,
      },
      { label: "Transactions", to: "/transactions", icon: <ReceiptLongIcon /> },
    ],
  },
  {
    label: "Selling",
    items: [{ label: "List a watch", to: "/listings/new", icon: <AddIcon /> }],
  },
] as const;

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const realtime = useAppSelector(selectRealtime);
  const notifications = useAppSelector(selectNotificationState);
  const latest = useAppSelector(selectNotifications).slice(0, 4);
  const unreadMessagesCount = useAppSelector((state) =>
    selectConversations(state).reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] =
    useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const closeDrawer = () => setDrawerOpen(false);
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);
  const headerControlStyle = {
    borderRadius: 1,
    transition: theme.transitions.create("background-color", {
      duration: theme.transitions.duration.short,
    }),
    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" },
  };
  const desktopLinkStyle = (path: string) => ({
    ...headerControlStyle,
    borderBottom: 2,
    borderColor: isActive(path) ? "secondary.light" : "transparent",
    "&:hover": {
      bgcolor: "rgba(255, 255, 255, 0.12)",
      borderColor: isActive(path)
        ? "secondary.light"
        : "rgba(255, 255, 255, 0.45)",
    },
  });
  const unreadCount =
    notifications.unreadCount > 99 ? "99+" : notifications.unreadCount;
  const unreadMessagesBadge =
    unreadMessagesCount > 99 ? "99+" : unreadMessagesCount;
  const visibleNavigationGroups = navigationGroups.filter(
    (group) => group.label === "Browse" || Boolean(user),
  );

  const renderDrawerItems = () => (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        {visibleNavigationGroups.map((group) => (
          <Box
            component="section"
            key={group.label}
            aria-label={group.label}
            sx={{ mb: 1.5 }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1.5, fontWeight: 700 }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  selected={isActive(item.to)}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  aria-label={
                    item.to === "/messages" && unreadMessagesCount > 0
                      ? `Messages, ${unreadMessagesBadge} unread ${unreadMessagesCount === 1 ? "message" : "messages"}`
                      : undefined
                  }
                  onClick={closeDrawer}
                  sx={{
                    borderRadius: 1,
                    minHeight: 48,
                    "&.Mui-selected": {
                      color: "primary.main",
                      bgcolor: "action.selected",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: { whiteSpace: "normal", overflowWrap: "anywhere" },
                      },
                    }}
                  />
                  {item.to === "/notifications" &&
                    notifications.unreadCount > 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        aria-label={`${notifications.unreadCount} unread notifications`}
                      >
                        {unreadCount}
                      </Typography>
                    )}
                  {item.to === "/messages" && unreadMessagesCount > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      aria-hidden="true"
                    >
                      {unreadMessagesBadge}
                    </Typography>
                  )}
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>
      <Divider />
      <Box component="section" aria-label="Account" sx={{ px: 1.5, py: 1.5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ px: 1.5, fontWeight: 700 }}
        >
          Account
        </Typography>
        <List disablePadding>
          {user ? (
            <>
              <ListItemButton
                component={RouterLink}
                to="/profile"
                selected={isActive("/profile")}
                onClick={closeDrawer}
                sx={{ borderRadius: 1, minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AccountCircleOutlinedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Profile"
                  slotProps={{ primary: { sx: { whiteSpace: "normal" } } }}
                />
              </ListItemButton>
              <ListItemButton
                onClick={() => {
                  closeDrawer();
                  void dispatch(logout());
                }}
                sx={{ borderRadius: 1, minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Log out" />
              </ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton
                component={RouterLink}
                to="/login"
                onClick={closeDrawer}
                sx={{ borderRadius: 1, minHeight: 48 }}
              >
                <ListItemText primary="Sign in" />
              </ListItemButton>
              <ListItemButton
                component={RouterLink}
                to="/register"
                onClick={closeDrawer}
                sx={{ borderRadius: 1, minHeight: 48 }}
              >
                <ListItemText primary="Create account" />
              </ListItemButton>
            </>
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="primary">
        <Container maxWidth="lg">
          <Toolbar
            disableGutters
            sx={{
              minWidth: 0,
              gap: { xs: 1, lg: 2 },
              minHeight: { xs: 64, sm: 72 },
            }}
          >
            {!isDesktop && (
              <IconButton
                color="inherit"
                edge="start"
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
                sx={headerControlStyle}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Link
              component={RouterLink}
              to="/"
              color="inherit"
              underline="none"
              sx={{
                flexShrink: 0,
                px: 1,
                py: 0.5,
                ml: -1,
                ...headerControlStyle,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <StorefrontIcon fontSize="small" />
                <Typography
                  variant="h6"
                  component="span"
                  sx={{ fontWeight: 700 }}
                >
                  Atlas
                </Typography>
              </Stack>
            </Link>
            {isDesktop ? (
              <>
                <Box
                  component="nav"
                  aria-label="Primary navigation"
                  sx={{ ml: 2, flex: 1 }}
                >
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      component={RouterLink}
                      to="/"
                      color="inherit"
                      aria-current={isActive("/") ? "page" : undefined}
                      sx={desktopLinkStyle("/")}
                    >
                      Marketplace
                    </Button>
                    {user && (
                      <Button
                        component={RouterLink}
                        to="/messages"
                        color="inherit"
                        aria-label={
                          unreadMessagesCount > 0
                            ? `Messages, ${unreadMessagesBadge} unread ${unreadMessagesCount === 1 ? "message" : "messages"}`
                            : "Messages"
                        }
                        aria-current={
                          isActive("/messages") ? "page" : undefined
                        }
                        sx={desktopLinkStyle("/messages")}
                      >
                        <Stack
                          component="span"
                          direction="row"
                          spacing={0.75}
                          sx={{ alignItems: "center" }}
                        >
                          <span>Messages</span>
                          {unreadMessagesCount > 0 && (
                            <Box
                              component="span"
                              sx={{
                                minWidth: 18,
                                height: 18,
                                px: 0.5,
                                borderRadius: 9,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "secondary.main",
                                color: "primary.dark",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                lineHeight: 1,
                              }}
                            >
                              {unreadMessagesBadge}
                            </Box>
                          )}
                        </Stack>
                      </Button>
                    )}
                    {user && (
                      <Button
                        component={RouterLink}
                        to="/transactions"
                        color="inherit"
                        aria-current={
                          isActive("/transactions") ? "page" : undefined
                        }
                        sx={desktopLinkStyle("/transactions")}
                      >
                        Transactions
                      </Button>
                    )}
                  </Stack>
                </Box>
                {user ? (
                  <>
                    <Button
                      component={RouterLink}
                      to="/listings/new"
                      color="secondary"
                      variant="contained"
                      startIcon={<AddIcon />}
                      sx={{
                        borderBottom: 2,
                        borderColor: isActive("/listings/new")
                          ? "secondary.light"
                          : "transparent",
                      }}
                    >
                      List a watch
                    </Button>
                    <IconButton
                      color="inherit"
                      onClick={(event) => {
                        setNotificationAnchor(event.currentTarget);
                        void dispatch(fetchNotifications());
                        void dispatch(fetchUnreadCount());
                      }}
                      aria-label={`Notifications, ${notifications.unreadCount} unread`}
                      aria-haspopup="menu"
                      aria-current={
                        isActive("/notifications") ? "page" : undefined
                      }
                      sx={{
                        ...headerControlStyle,
                        bgcolor: isActive("/notifications")
                          ? "rgba(255,255,255,0.12)"
                          : "transparent",
                      }}
                    >
                      <Badge badgeContent={unreadCount} color="secondary">
                        <NotificationsNoneIcon />
                      </Badge>
                    </IconButton>
                    <IconButton
                      color="inherit"
                      onClick={(event) => setProfileAnchor(event.currentTarget)}
                      aria-label="Open account menu"
                      aria-haspopup="menu"
                      aria-expanded={Boolean(profileAnchor)}
                      sx={headerControlStyle}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: "secondary.main",
                          color: "primary.dark",
                          fontSize: "0.9rem",
                        }}
                      >
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </Avatar>
                    </IconButton>
                    <Menu
                      anchorEl={profileAnchor}
                      open={Boolean(profileAnchor)}
                      onClose={() => setProfileAnchor(null)}
                    >
                      <MenuItem
                        component={RouterLink}
                        to="/profile"
                        selected={isActive("/profile")}
                        onClick={() => setProfileAnchor(null)}
                      >
                        Profile
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setProfileAnchor(null);
                          void dispatch(logout());
                        }}
                      >
                        Log out
                      </MenuItem>
                    </Menu>
                    <Menu
                      anchorEl={notificationAnchor}
                      open={Boolean(notificationAnchor)}
                      onClose={() => setNotificationAnchor(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                      slotProps={{
                        paper: {
                          sx: { width: 360, maxWidth: "calc(100vw - 32px)" },
                        },
                      }}
                    >
                      {latest.length === 0 ? (
                        <MenuItem disabled>No notifications yet</MenuItem>
                      ) : (
                        latest.map((notification) => (
                          <MenuItem
                            key={notification.id}
                            selected={!notification.readAt}
                            onClick={() => {
                              setNotificationAnchor(null);
                              navigate("/notifications");
                            }}
                            sx={{
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {notification.title}
                          </MenuItem>
                        ))
                      )}
                      <Divider />
                      <MenuItem
                        onClick={() => {
                          setNotificationAnchor(null);
                          navigate("/notifications");
                        }}
                      >
                        View all notifications
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
                    <Button
                      component={RouterLink}
                      to="/login"
                      color="inherit"
                      sx={headerControlStyle}
                    >
                      Sign in
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/register"
                      color="secondary"
                      variant="contained"
                    >
                      Create account
                    </Button>
                  </Stack>
                )}
              </>
            ) : (
              <Box
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {user && (
                  <IconButton
                    color="inherit"
                    component={RouterLink}
                    to="/notifications"
                    aria-label={`Notifications, ${notifications.unreadCount} unread`}
                    sx={headerControlStyle}
                  >
                    <Badge badgeContent={unreadCount} color="secondary">
                      <NotificationsNoneIcon />
                    </Badge>
                  </IconButton>
                )}
                {!user && (
                  <Button
                    component={RouterLink}
                    to="/login"
                    color="inherit"
                    sx={headerControlStyle}
                  >
                    Sign in
                  </Button>
                )}
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={closeDrawer}
        slotProps={{
          paper: {
            sx: {
              width: "min(340px, calc(100vw - 32px))",
              maxWidth: "100vw",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            minHeight: 64,
          }}
        >
          <Typography variant="h6" component="p" sx={{ fontWeight: 700 }}>
            Atlas Marketplace
          </Typography>
          <IconButton aria-label="Close navigation menu" onClick={closeDrawer}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider />
        {renderDrawerItems()}
      </Drawer>
      {user && (
        <Box
          sx={{ px: 2, py: 0.75, textAlign: "center", bgcolor: "action.hover" }}
        >
          <Typography variant="caption" color="text.secondary" role="status">
            {realtime.connectionStatus === "connected"
              ? "Live updates connected"
              : realtime.connectionStatus === "reconnecting"
                ? "Reconnecting to live updates..."
                : "Connecting to live updates..."}
          </Typography>
        </Box>
      )}
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flex: 1, py: { xs: 3, md: 7 }, minWidth: 0 }}
      >
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
        <Alert
          onClose={() => dispatch(notificationClosed())}
          severity={realtime.notification?.severity}
          role="status"
        >
          {realtime.notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
