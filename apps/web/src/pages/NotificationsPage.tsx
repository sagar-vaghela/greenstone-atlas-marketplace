import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchNotifications,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  selectNotificationState,
  selectNotifications,
} from "../features/notifications/notificationsSlice";
import { getOffer } from "../api/offers";
import type { Notification } from "@atlas/types";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const destination = async (
  notification: Notification,
  navigate: (path: string) => void,
) => {
  if (notification.resourceType === "conversation")
    return navigate(`/messages/${notification.resourceId}`);
  if (notification.resourceType === "transaction")
    return navigate(`/transactions/${notification.resourceId}`);
  if (notification.resourceType === "listing")
    return navigate(`/listings/${notification.resourceId}`);
  try {
    const offer = await getOffer(notification.resourceId);
    navigate(`/listings/${offer.listingId}`);
  } catch {
    navigate("/notifications");
  }
};

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const state = useAppSelector(selectNotificationState);
  const notifications = useAppSelector(selectNotifications);
  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);
  const open = (notification: Notification) => {
    if (!notification.readAt)
      void dispatch(markNotificationReadAction(notification.id));
    void destination(notification, navigate);
  };
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 2 }}
      >
        <Box>
          <Typography variant="h1">Notifications</Typography>
          <Typography color="text.secondary">
            Your recent marketplace activity.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => void dispatch(markAllNotificationsReadAction())}
          disabled={state.unreadCount === 0}
        >
          Mark all as read
        </Button>
      </Stack>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.listStatus === "loading" && notifications.length === 0 ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress aria-label="Loading notifications" />
        </Box>
      ) : notifications.length === 0 ? (
        <Alert severity="info">You have no notifications yet.</Alert>
      ) : (
        <List
          disablePadding
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              {index > 0 && <Divider />}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => open(notification)}
                  sx={{
                    py: 2,
                    alignItems: "flex-start",
                    gap: 1.5,
                    bgcolor: notification.readAt
                      ? "background.paper"
                      : "action.hover",
                  }}
                  aria-label={`${notification.readAt ? "Read" : "Unread"}: ${notification.title}`}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: notification.readAt
                        ? "transparent"
                        : "primary.main",
                      border: 1,
                      borderColor: notification.readAt
                        ? "divider"
                        : "primary.main",
                      mt: 1,
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                    primary={
                      <Typography
                        sx={{
                          fontWeight: notification.readAt ? 500 : 700,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        {notification.body}
                        <br />
                        <Typography
                          component="time"
                          dateTime={notification.createdAt}
                          variant="caption"
                        >
                          {formatTime(notification.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            </Box>
          ))}
        </List>
      )}
      {state.nextCursor && (
        <Button
          variant="text"
          onClick={() =>
            void dispatch(fetchNotifications({ before: state.nextCursor }))
          }
          disabled={state.listStatus === "loading"}
        >
          Load earlier notifications
        </Button>
      )}
    </Stack>
  );
}
