import { FormEvent, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import { fetchConversation, fetchMessages, markConversationReadAction, selectConversation, selectMessageState, selectMessages, selectMessaging, sendMessageAction } from "../features/messaging/messagingSlice";

const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export function ConversationPage() {
  const { conversationId } = useParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const conversation = useAppSelector((state) => selectConversation(state, conversationId));
  const messages = useAppSelector((state) => selectMessages(state, conversationId));
  const messageState = useAppSelector((state) => selectMessageState(state, conversationId));
  const messaging = useAppSelector(selectMessaging);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!conversationId) return;
    void dispatch(fetchConversation(conversationId));
    void dispatch(fetchMessages({ id: conversationId }));
    void dispatch(markConversationReadAction(conversationId));
  }, [conversationId, dispatch]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!conversationId || !trimmed || messaging.messageStatus === "loading") return;
    void dispatch(sendMessageAction({ id: conversationId, body: trimmed })).then((result) => {
      if (sendMessageAction.fulfilled.match(result)) setBody("");
    });
  };

  if (!conversation && messageState.status === "loading") return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress aria-label="Loading conversation" /></Box>;
  if (!conversation) return <Alert severity="error">{messaging.error ?? "This conversation is unavailable."}</Alert>;

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Button component={RouterLink} to="/messages" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>Back to messages</Button>
      <Box><Typography variant="h1" sx={{ overflowWrap: "anywhere" }}>{conversation.otherParticipant.displayName}</Typography><Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{conversation.listing.title}</Typography></Box>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, minHeight: 360, maxHeight: "55vh", overflowY: "auto" }} component="section" aria-label="Message history">
        {messageState.status === "loading" && messages.length === 0 ? <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress aria-label="Loading messages" /></Box> : messages.length === 0 ? <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Start the conversation about this listing.</Typography> : <Stack spacing={1.5}>{messageState.nextCursor && <Button size="small" onClick={() => void dispatch(fetchMessages({ id: conversation.id, before: messageState.nextCursor }))}>Load older messages</Button>}{messages.map((item) => { const own = item.senderId === user?.id; return <Box key={item.id} sx={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start" }}><Box sx={{ maxWidth: "min(80%, 560px)", bgcolor: own ? "primary.main" : "action.hover", color: own ? "primary.contrastText" : "text.primary", borderRadius: 2, px: 2, py: 1, overflowWrap: "anywhere" }}><Typography component="p" sx={{ whiteSpace: "pre-wrap", m: 0 }}>{item.body}</Typography><Typography component="time" dateTime={item.createdAt} variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.75, textAlign: own ? "right" : "left" }}>{formatTime(item.createdAt)}</Typography></Box></Box>; })}</Stack>}
      </Paper>
      {messaging.error && messaging.messageStatus === "failed" && <Alert severity="error">{messaging.error}</Alert>}
      <Box component="form" onSubmit={submit} sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField fullWidth multiline maxRows={5} label="Message" value={body} onChange={(event) => setBody(event.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} disabled={messaging.messageStatus === "loading"} />
        <IconButton type="submit" color="primary" aria-label="Send message" disabled={!body.trim() || messaging.messageStatus === "loading"}><SendIcon /></IconButton>
      </Box>
      <Divider />
      <Typography variant="caption" color="text.secondary">Messages are plain text and limited to 2,000 characters.</Typography>
    </Stack>
  );
}
