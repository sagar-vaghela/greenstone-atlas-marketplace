import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Button, Stack } from "@mui/material";

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry }: { message?: string; onRetry?: () => void }) {
  return <Alert severity="error" icon={<ErrorIcon />} action={onRetry ? <Button color="inherit" startIcon={<RefreshIcon />} onClick={onRetry}>Retry</Button> : undefined}>{message}</Alert>;
}
