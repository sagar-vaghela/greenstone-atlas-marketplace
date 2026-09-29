import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchListingById,
  selectDetailStatus,
  selectListingsError,
  selectSelectedListing,
} from "../features/listings/listingsSlice";

export function ListingDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const listing = useAppSelector(selectSelectedListing);
  const detailStatus = useAppSelector(selectDetailStatus);
  const error = useAppSelector(selectListingsError);

  useEffect(() => {
    if (id) {
      void dispatch(fetchListingById(id));
    }
  }, [dispatch, id]);

  if (
    detailStatus === "idle" ||
    detailStatus === "loading" ||
    listing?.id !== id
  ) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          py: 6,
        }}
      >
        <CircularProgress aria-label="Loading listing" />
        <Typography color="text.secondary">Loading listing...</Typography>
      </Box>
    );
  }

  if (detailStatus === "failed" && error === "Listing not found") {
    return (
      <Stack spacing={2}>
        <Typography variant="h1">Listing not found</Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
        >
          Back to marketplace
        </Button>
      </Stack>
    );
  }

  if (detailStatus === "failed" || !listing) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          Unable to load this listing. Please try again.
        </Alert>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
        >
          Back to marketplace
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/" sx={{ alignSelf: "flex-start" }}>
        Back to marketplace
      </Button>
      <Stack spacing={1}>
        <Typography variant="h1">{listing.title}</Typography>
        <Typography color="text.secondary">{listing.category}</Typography>
      </Stack>
      <Divider />
      <Typography>{listing.description}</Typography>
      <Stack spacing={1}>
        <Typography variant="h4">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: listing.currency,
            maximumFractionDigits: 0,
          }).format(listing.price)}
        </Typography>
        <Typography>
          <strong>Currency:</strong> {listing.currency}
        </Typography>
        <Typography>
          <strong>Status:</strong> {listing.status}
        </Typography>
      </Stack>
    </Stack>
  );
}
