import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reference: string;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reference: "" };

  static getDerivedStateFromError(): State {
    return { hasError: true, reference: crypto.randomUUID().slice(0, 8).toUpperCase() };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("Unhandled frontend error", { error, componentStack: info.componentStack });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh", px: 2 }}>
        <Paper variant="outlined" sx={{ maxWidth: 520, p: 4 }}>
          <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
            <ErrorIcon color="error" fontSize="large" />
            <Typography variant="h4">Something went wrong.</Typography>
            <Typography color="text.secondary">Please try again or reload the page.</Typography>
            <Typography variant="body2" color="text.secondary">Reference: {this.state.reference}</Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>Reload</Button>
          </Stack>
        </Paper>
      </Box>
    );
  }
}