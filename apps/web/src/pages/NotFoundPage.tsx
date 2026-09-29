import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h1">404</Typography>
      <Typography variant="h5">Page not found</Typography>
      <Button component={RouterLink} to="/" variant="outlined" sx={{ alignSelf: "flex-start" }}>
        Back to marketplace
      </Button>
    </Stack>
  );
}