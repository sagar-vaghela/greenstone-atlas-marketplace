import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchSellerProfile,
  selectSellerState,
} from "../../features/sellers/sellerSlice";
import { useEffect } from "react";

export function SellerCard({ sellerId }: { sellerId: string }) {
  const dispatch = useAppDispatch();
  const sellerState = useAppSelector(selectSellerState);
  const seller =
    sellerState.selectedSeller?.user.id === sellerId
      ? sellerState.selectedSeller
      : null;
  useEffect(() => {
    void dispatch(fetchSellerProfile(sellerId));
  }, [dispatch, sellerId]);
  if (sellerState.selectedSellerStatus === "loading" && !seller)
    return <CircularProgress aria-label="Loading seller profile" />;
  if (sellerState.selectedSellerStatus === "failed" || !seller) {
    return (
      <Alert severity="info">
        Seller information is currently unavailable.
      </Alert>
    );
  }
  const verification =
    seller.profile.verificationStatus === "verified"
      ? "Identity verified"
      : seller.profile.verificationStatus === "pending"
        ? "Verification pending"
        : "Not verified";
  return (
    <Card
      variant="outlined"
      component="section"
      aria-labelledby="seller-card-heading"
    >
      <CardContent>
        <Stack spacing={1.5}>
          <Typography id="seller-card-heading" variant="h5">
            Seller
          </Typography>
          <Typography variant="h6">{seller.user.displayName}</Typography>
          <Typography color="text.secondary">{verification}</Typography>
          <Typography variant="body2" color="text.secondary">
            Member since {new Date(seller.profile.memberSince).getFullYear()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {seller.stats.soldListings} sold listings ·{" "}
            {seller.stats.activeListings} active watches
          </Typography>
          <Button
            component={RouterLink}
            to={`/sellers/${seller.user.id}`}
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          >
            View seller profile
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
