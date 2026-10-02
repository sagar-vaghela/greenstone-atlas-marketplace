import { Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function BackToMarketplaceButton() {
  return (
    <Button
      component={RouterLink}
      to="/"
      variant="outlined"
      sx={{ alignSelf: "flex-start" }}
    >
      Back to marketplace
    </Button>
  );
}
