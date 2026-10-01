import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { ListingCard } from "../components/listings/ListingCard";
import {
  fetchSellerListings,
  fetchSellerProfile,
  selectSellerState,
} from "../features/sellers/sellerSlice";

export function SellerProfilePage() {
  const { sellerId } = useParams();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectSellerState);
  const seller =
    state.selectedSeller?.user.id === sellerId ? state.selectedSeller : null;
  useEffect(() => {
    if (sellerId) {
      void dispatch(fetchSellerProfile(sellerId));
      void dispatch(fetchSellerListings(sellerId));
    }
  }, [dispatch, sellerId]);
  if (state.selectedSellerStatus === "loading" || !seller)
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress aria-label="Loading seller profile" />
      </Box>
    );
  if (state.selectedSellerStatus === "failed")
    return (
      <Stack spacing={2}>
        <Alert severity="error">{state.selectedSellerError}</Alert>
        <Button component={RouterLink} to="/">
          Back to marketplace
        </Button>
      </Stack>
    );
  const verification =
    seller.profile.verificationStatus === "verified"
      ? "Identity verified"
      : seller.profile.verificationStatus === "pending"
        ? "Verification pending"
        : "Not verified";
  return (
    <Stack
      spacing={4}
      component="section"
      aria-labelledby="seller-profile-heading"
    >
      <Stack spacing={1}>
        <Typography variant="h1" id="seller-profile-heading">
          {seller.user.displayName}
        </Typography>
        <Typography color="text.secondary">
          {verification} · Member since{" "}
          {new Date(seller.profile.memberSince).getFullYear()}
        </Typography>
        {seller.profile.bio && <Typography>{seller.profile.bio}</Typography>}
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h4">{seller.stats.activeListings}</Typography>
            <Typography color="text.secondary">Active listings</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h4">{seller.stats.soldListings}</Typography>
            <Typography color="text.secondary">Sold listings</Typography>
          </CardContent>
        </Card>
        {seller.profile.responseRate !== undefined && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h4">
                {seller.profile.responseRate}%
              </Typography>
              <Typography color="text.secondary">
                Marketplace response rate
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
      {seller.profile.location && (
        <Typography color="text.secondary">
          Based in {seller.profile.location}
        </Typography>
      )}
      <Stack
        spacing={2}
        component="section"
        aria-labelledby="seller-listings-heading"
      >
        <Typography variant="h2" id="seller-listings-heading">
          Currently listed
        </Typography>
        {state.sellerListingsStatus === "loading" && (
          <Typography color="text.secondary">
            Loading active listings...
          </Typography>
        )}
        {state.sellerListingsStatus === "failed" && (
          <Alert severity="error">{state.sellerListingsError}</Alert>
        )}
        {state.sellerListingsStatus === "succeeded" &&
          state.sellerListings.length === 0 && (
            <Typography color="text.secondary">
              This seller has no active watches listed right now.
            </Typography>
          )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          {state.sellerListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Box>
      </Stack>
    </Stack>
  );
}
