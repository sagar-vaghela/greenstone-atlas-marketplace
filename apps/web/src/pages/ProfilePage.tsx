import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectCurrentUser,
  updateDisplayName,
} from "../features/auth/authSlice";
import {
  fetchCurrentSellerProfile,
  selectSellerState,
  updateSellerProfile,
} from "../features/sellers/sellerSlice";

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const state = useAppSelector(selectSellerState);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  useEffect(() => {
    void dispatch(fetchCurrentSellerProfile());
  }, [dispatch]);
  useEffect(() => {
    if (state.currentSellerProfile) {
      setDisplayName(state.currentSellerProfile.user.displayName);
      setBio(state.currentSellerProfile.profile.bio ?? "");
      setLocation(state.currentSellerProfile.profile.location ?? "");
    }
  }, [state.currentSellerProfile]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await dispatch(
        updateSellerProfile({ displayName, bio, location }),
      ).unwrap();
      dispatch(updateDisplayName(result.user.displayName));
    } catch {
      /* state displays the safe API error */
    }
  };
  if (state.currentProfileStatus === "loading" && !state.currentSellerProfile)
    return <CircularProgress aria-label="Loading your profile" />;
  return (
    <Stack spacing={3} sx={{ maxWidth: 640, mx: "auto" }}>
      <Stack spacing={1}>
        <Typography variant="h1">Seller profile</Typography>
        <Typography color="text.secondary">
          Keep the information buyers use to understand who is selling.
        </Typography>
      </Stack>
      <Paper
        component="form"
        onSubmit={submit}
        variant="outlined"
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={2}>
          <TextField
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label="Bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            multiline
            minRows={4}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            helperText={`${bio.length}/500`}
          />
          <TextField
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            helperText="Use a broad location such as city and country."
          />
          {state.updateError && (
            <Alert severity="error">{state.updateError}</Alert>
          )}
          {state.updateStatus === "succeeded" && (
            <Alert severity="success">Profile saved.</Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={state.updateStatus === "loading" || !displayName.trim()}
          >
            {state.updateStatus === "loading" ? "Saving..." : "Save profile"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
