import { Stack, Typography } from "@mui/material";
import { BackToMarketplaceButton } from "../components/common/BackToMarketplaceButton";

export function NotFoundPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h1">404</Typography>
      <Typography variant="h5">Page not found</Typography>
      <BackToMarketplaceButton />
    </Stack>
  );
}