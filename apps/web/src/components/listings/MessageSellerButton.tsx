import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectCurrentUser } from "../../features/auth/authSlice";
import { createConversationAction } from "../../features/messaging/messagingSlice";

export function MessageSellerButton({
  listingId,
  sellerId,
}: {
  listingId: string;
  sellerId: string;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector(selectCurrentUser);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentUser?.id === sellerId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Your listing
      </Typography>
    );
  }

  if (!currentUser) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Button
        component={RouterLink}
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        variant="outlined"
      >
        Contact seller
      </Button>
    );
  }

  const startConversation = () => {
    setIsStarting(true);
    setError(null);
    void dispatch(createConversationAction(listingId)).then((result) => {
      setIsStarting(false);
      if (createConversationAction.fulfilled.match(result)) {
        void navigate(`/messages/${result.payload.id}`);
      } else {
        setError(result.payload ?? "Unable to start a conversation.");
      }
    });
  };

  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Button onClick={startConversation} variant="outlined" disabled={isStarting}>
        {isStarting ? "Opening conversation..." : "Message seller"}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
