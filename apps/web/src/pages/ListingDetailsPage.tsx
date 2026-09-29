import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import type { Listing } from "@atlas/types";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { getListingById } from "../api/listings";

export function ListingDetailsPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing>();
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setHasError(false);
    getListingById(id)
      .then(setListing)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          setIsNotFound(true);
        } else {
          setHasError(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 6 }}>
        <CircularProgress aria-label="Loading listing" />
        <Typography color="text.secondary">Loading listing...</Typography>
      </Box>
    );
  }

  if (isNotFound) {
    return (
      <Stack spacing={2}>
        <Typography variant="h1">Listing not found</Typography>
        <Button component={RouterLink} to="/" variant="outlined" sx={{ alignSelf: "flex-start" }}>
          Back to marketplace
        </Button>
      </Stack>
    );
  }

  if (hasError || !listing) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Unable to load this listing. Please try again.</Alert>
        <Button component={RouterLink} to="/" variant="outlined" sx={{ alignSelf: "flex-start" }}>
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