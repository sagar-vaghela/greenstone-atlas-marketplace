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
import { login, selectAuth } from "../features/auth/authSlice";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector(selectAuth);
  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate(returnTo, { replace: true });
    } catch {
      /* state displays the safe API error */
    }
  };
  return (
    <Stack spacing={3} sx={{ maxWidth: 460, mx: "auto" }}>
      <Stack spacing={1}>
        <Typography variant="h1">Welcome back</Typography>
        <Typography color="text.secondary">
          Sign in to manage watches and offers.
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
            autoComplete="current-password"
            required
            fullWidth
          />
          {auth.error && <Alert severity="error">{auth.error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={auth.status === "loading"}
          >
            {auth.status === "loading" ? "Signing in..." : "Sign in"}
          </Button>
          <Button
            component={RouterLink}
            to={`/register${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            color="inherit"
          >
            Create an account
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
