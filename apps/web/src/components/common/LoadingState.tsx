import { Box, CircularProgress, Skeleton, Stack, Typography } from "@mui/material";

export function LoadingState({ label = "Loading", skeleton = false }: { label?: string; skeleton?: boolean }) {
  if (skeleton) {
    return <Stack spacing={1.5} aria-label={label}><Skeleton variant="rounded" height={220} /><Skeleton width="70%" height={32} /><Skeleton width="42%" height={24} /></Stack>;
  }
  return <Box sx={{ display: "grid", placeItems: "center", gap: 1, py: 8 }} role="status" aria-label={label}><CircularProgress size={28} /><Typography color="text.secondary">{label}</Typography></Box>;
}
