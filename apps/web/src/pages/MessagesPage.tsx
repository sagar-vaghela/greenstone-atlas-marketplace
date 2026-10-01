import { useEffect } from "react";
import {
  Alert,
  Badge,
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
import { Link as RouterLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchConversations,
  selectConversations,
  selectMessaging,
} from "../features/messaging/messagingSlice";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function MessagesPage() {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectConversations);
  const messaging = useAppSelector(selectMessaging);
  useEffect(() => {
    void dispatch(fetchConversations());
  }, [dispatch]);

  if (messaging.listStatus === "loading" && conversations.length === 0) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress aria-label="Loading conversations" />
      </Box>
    );
  }
  if (messaging.listStatus === "failed") {
    return (
      <Stack spacing={2}>
        <Typography variant="h1">Messages</Typography>
        <Alert severity="error">
          {messaging.error ?? "Unable to load your conversations."}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => void dispatch(fetchConversations())}
        >
          Retry
        </Button>
      </Stack>
    );
  }
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Messages</Typography>
        <Typography color="text.secondary">
          Private conversations with marketplace participants.
        </Typography>
      </Box>
      {conversations.length === 0 ? (
        <Alert severity="info">
          No conversations yet. Open a listing to message its seller.
        </Alert>
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
          {conversations.map((conversation, index) => (
            <Box key={conversation.id}>
              {index > 0 && <Divider />}
              <ListItem disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={`/messages/${conversation.id}`}
                  sx={{ py: 2, gap: 2, alignItems: "flex-start" }}
                >
                  <ListItemText
                    sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                    primary={
                      <Typography
                        sx={{
                          fontWeight: conversation.unreadCount > 0 ? 700 : 500,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {conversation.otherParticipant.displayName}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {conversation.listing.title}
                        </Typography>
                        <br />
                        {conversation.lastMessagePreview ?? "No messages yet"}
                        <br />
                        <Typography component="span" variant="caption">
                          {formatTime(conversation.lastMessageAt)}
                        </Typography>
                      </>
                    }
                  />
                  {conversation.unreadCount > 0 && (
                    <Badge
                      color="primary"
                      badgeContent={conversation.unreadCount}
                      sx={{ mt: 1, mr: 1 }}
                      aria-label={`${conversation.unreadCount} unread messages`}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Box>
          ))}
        </List>
      )}
    </Stack>
  );
}
