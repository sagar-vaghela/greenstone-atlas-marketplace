import { useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { register, selectAuth } from "../features/auth/authSlice";

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector(selectAuth);
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword !== "" && password !== confirmPassword;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mismatch || password.length < 8) return;
    try {
      await dispatch(register({ displayName, email, password })).unwrap();
      navigate(returnTo, { replace: true });
    } catch {
      /* state displays the safe API error */
    }
  };
  return (
    <Stack spacing={3} sx={{ maxWidth: 460, mx: "auto" }}>
      <Stack spacing={1}>
        <Typography variant="h1">Create your account</Typography>
        <Typography color="text.secondary">
          Browse freely, then transact with confidence.
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
            autoComplete="name"
            required
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            fullWidth
            helperText="Use at least 8 characters."
            error={password !== "" && password.length < 8}
          />
          <TextField
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            fullWidth
            error={mismatch}
            helperText={mismatch ? "Passwords do not match." : undefined}
          />
          {auth.error && <Alert severity="error">{auth.error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={
              auth.status === "loading" || mismatch || password.length < 8
            }
          >
            {auth.status === "loading"
              ? "Creating account..."
              : "Create account"}
          </Button>
          <Button
            component={RouterLink}
            to={`/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            color="inherit"
          >
            Already have an account? Sign in
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
