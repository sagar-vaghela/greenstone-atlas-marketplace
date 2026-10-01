import {
  FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import {
  fetchConversation,
  fetchMessages,
  markConversationReadAction,
  selectConversation,
  selectMessageState,
  selectMessages,
  selectMessaging,
  sendMessageAction,
  clearTypingIndicator,
  selectTypingIndicator,
} from "../features/messaging/messagingSlice";
import { setConversationTyping } from "../api/messaging";
import { conversationMessagesRead } from "../features/notifications/notificationsSlice";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function ConversationPage() {
  const { conversationId } = useParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const conversation = useAppSelector((state) =>
    selectConversation(state, conversationId),
  );
  const messages = useAppSelector((state) =>
    selectMessages(state, conversationId),
  );
  const messageState = useAppSelector((state) =>
    selectMessageState(state, conversationId),
  );
  const typingIndicator = useAppSelector((state) =>
    selectTypingIndicator(state, conversationId),
  );
  const messaging = useAppSelector(selectMessaging);
  const [body, setBody] = useState("");
  const typingActive = useRef(false);
  const lastTypingSignalAt = useRef(0);
  const typingTimeout = useRef<number | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    void dispatch(fetchConversation(conversationId));
    void dispatch(fetchMessages({ id: conversationId }));
    void dispatch(markConversationReadAction(conversationId)).then((result) => {
      if (markConversationReadAction.fulfilled.match(result)) {
        dispatch(
          conversationMessagesRead({
            conversationId: result.payload.conversationId,
            notificationReadAt: result.payload.notificationReadAt,
            unreadCount: result.payload.notificationUnreadCount,
          }),
        );
      }
    });
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!conversationId || !typingIndicator) return;
    const timeout = window.setTimeout(() => {
      dispatch(clearTypingIndicator({ conversationId, ...typingIndicator }));
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [conversationId, dispatch, typingIndicator]);

  useLayoutEffect(() => {
    if (!typingIndicator || typingIndicator.userId === user?.id) return;
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [typingIndicator?.updatedAt, typingIndicator?.userId, user?.id]);

  useEffect(
    () => () => {
      if (typingTimeout.current !== null)
        window.clearTimeout(typingTimeout.current);
      if (conversationId && typingActive.current)
        void setConversationTyping(conversationId, false).catch(
          () => undefined,
        );
    },
    [conversationId],
  );

  const stopTyping = () => {
    if (typingTimeout.current !== null)
      window.clearTimeout(typingTimeout.current);
    typingTimeout.current = null;
    if (conversationId && typingActive.current) {
      typingActive.current = false;
      void setConversationTyping(conversationId, false).catch(() => undefined);
    }
  };

  const changeBody = (value: string) => {
    setBody(value);
    if (!conversationId) return;
    if (!value.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (!typingActive.current || now - lastTypingSignalAt.current >= 2000) {
      typingActive.current = true;
      lastTypingSignalAt.current = now;
      void setConversationTyping(conversationId, true).catch(() => undefined);
    }
    if (typingTimeout.current !== null)
      window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => {
      typingTimeout.current = null;
      if (typingActive.current) {
        typingActive.current = false;
        void setConversationTyping(conversationId, false).catch(
          () => undefined,
        );
      }
    }, 1800);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!conversationId || !trimmed || messaging.messageStatus === "loading")
      return;
    stopTyping();
    void dispatch(
      sendMessageAction({ id: conversationId, body: trimmed }),
    ).then((result) => {
      if (sendMessageAction.fulfilled.match(result)) setBody("");
    });
  };

  const handleComposerKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  if (!conversation && messageState.status === "loading")
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress aria-label="Loading conversation" />
      </Box>
    );
  if (!conversation)
    return (
      <Alert severity="error">
        {messaging.error ?? "This conversation is unavailable."}
      </Alert>
    );

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Button
        component={RouterLink}
        to="/messages"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start" }}
      >
        Back to messages
      </Button>
      <Box>
        <Typography variant="h1" sx={{ overflowWrap: "anywhere" }}>
          {conversation.otherParticipant.displayName}
        </Typography>
        <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
          {conversation.listing.title}
        </Typography>
      </Box>
      <Paper
        ref={historyRef}
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 3 },
          minHeight: 360,
          maxHeight: "55vh",
          overflowY: "auto",
        }}
        component="section"
        aria-label="Message history"
      >
        <Stack spacing={1.5}>
          {messageState.status === "loading" && messages.length === 0 && (
            <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
              <CircularProgress aria-label="Loading messages" />
            </Box>
          )}
          {messageState.status !== "loading" && messages.length === 0 && (
            <Typography
              color="text.secondary"
              sx={{ py: 6, textAlign: "center" }}
            >
              Start the conversation about this listing.
            </Typography>
          )}
          {messages.length > 0 && (
            <Stack spacing={1.5}>
              {messageState.nextCursor && (
                <Button
                  size="small"
                  onClick={() =>
                    void dispatch(
                      fetchMessages({
                        id: conversation.id,
                        before: messageState.nextCursor,
                      }),
                    )
                  }
                >
                  Load older messages
                </Button>
              )}
              {messages.map((item) => {
                const own = item.senderId === user?.id;
                return (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      justifyContent: own ? "flex-end" : "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: "min(80%, 560px)",
                        bgcolor: own ? "primary.main" : "action.hover",
                        color: own ? "primary.contrastText" : "text.primary",
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <Typography
                        component="p"
                        sx={{ whiteSpace: "pre-wrap", m: 0 }}
                      >
                        {item.body}
                      </Typography>
                      <Typography
                        component="time"
                        dateTime={item.createdAt}
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 0.5,
                          opacity: 0.75,
                          textAlign: own ? "right" : "left",
                        }}
                      >
                        {formatTime(item.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
          {typingIndicator && typingIndicator.userId !== user?.id && (
            <Box
              role="status"
              aria-label={`${conversation.otherParticipant.displayName} is typing`}
              aria-live="polite"
              sx={{ display: "flex", justifyContent: "flex-start" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minHeight: 40,
                  px: 1.5,
                  py: 1,
                  color: "text.secondary",
                  bgcolor: "action.hover",
                  borderRadius: "16px 16px 16px 4px",
                }}
              >
                <Typography component="span" variant="body2">
                  {conversation.otherParticipant.displayName} is typing
                </Typography>
                <Box
                  aria-hidden="true"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  {[0, 1, 2].map((dot) => (
                    <Box
                      key={dot}
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        bgcolor: "currentColor",
                        animation: "chatTypingPulse 1.15s ease-in-out infinite",
                        animationDelay: `${dot * 0.15}s`,
                        "@keyframes chatTypingPulse": {
                          "0%, 60%, 100%": {
                            transform: "translateY(0)",
                            opacity: 0.45,
                          },
                          "30%": {
                            transform: "translateY(-3px)",
                            opacity: 1,
                          },
                        },
                        "@media (prefers-reduced-motion: reduce)": {
                          animation: "none",
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Stack>
      </Paper>
      {messaging.error && messaging.messageStatus === "failed" && (
        <Alert severity="error">{messaging.error}</Alert>
      )}
      <Box
        component="form"
        onSubmit={submit}
        sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={5}
          label="Message"
          value={body}
          onChange={(event) => changeBody(event.target.value)}
          slotProps={{
            htmlInput: { maxLength: 2000, onKeyDown: handleComposerKeyDown },
          }}
          disabled={messaging.messageStatus === "loading"}
        />
        <IconButton
          type="submit"
          color="primary"
          aria-label="Send message"
          disabled={!body.trim() || messaging.messageStatus === "loading"}
        >
          <SendIcon />
        </IconButton>
      </Box>
      <Divider />
      <Typography variant="caption" color="text.secondary">
        Messages are plain text and limited to 2,000 characters.
      </Typography>
    </Stack>
  );
}
