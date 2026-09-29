import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { Listing } from "@atlas/types";
import { Link as RouterLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchListings,
  selectListings,
  selectListingsError,
  selectListStatus,
} from "../features/listings/listingsSlice";

const formatPrice = (listing: Listing) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.price);

export function MarketplacePage() {
  const dispatch = useAppDispatch();
  const listings = useAppSelector(selectListings);
  const listStatus = useAppSelector(selectListStatus);
  const error = useAppSelector(selectListingsError);

  const loadListings = () => dispatch(fetchListings());

  useEffect(() => {
    if (listStatus === "idle") {
      void dispatch(fetchListings());
    }
  }, [dispatch, listStatus]);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h1">Atlas Marketplace</Typography>
        <Typography color="text.secondary">
          Browse the latest listings from the marketplace.
        </Typography>
      </Stack>

      {listStatus === "loading" && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 6,
          }}
        >
          <CircularProgress aria-label="Loading listings" />
          <Typography color="text.secondary">Loading listings...</Typography>
        </Box>
      )}

      {listStatus === "failed" && (
        <Alert
          severity="error"
          action={<Button onClick={loadListings}>Try again</Button>}
        >
          {error ?? "Unable to load listings."} Please try again.
        </Alert>
      )}

      {listStatus === "succeeded" && (
        <Stack spacing={2}>
          {listings.map((listing) => (
            <Card key={listing.id} variant="outlined">
              <CardActionArea
                component={RouterLink}
                to={`/listings/${listing.id}`}
              >
                <CardContent>
                  <Typography variant="h5" component="h2">
                    {listing.title}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {formatPrice(listing)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {listing.category}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
