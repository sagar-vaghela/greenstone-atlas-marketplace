import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { ListingStatus } from "@atlas/types";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchListingById,
  selectStatusUpdateError,
  selectStatusUpdateStatus,
  selectDetailStatus,
  selectListingsError,
  selectSelectedListing,
  updateListingStatus,
} from "../features/listings/listingsSlice";

const statusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  sold: "Sold",
};

const statusColors: Record<ListingStatus, "default" | "success" | "info"> = {
  draft: "default",
  active: "success",
  sold: "info",
};

export function ListingDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const listing = useAppSelector(selectSelectedListing);
  const detailStatus = useAppSelector(selectDetailStatus);
  const error = useAppSelector(selectListingsError);
  const statusUpdateStatus = useAppSelector(selectStatusUpdateStatus);
  const statusUpdateError = useAppSelector(selectStatusUpdateError);
  const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);

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

  const nextStatus = listing.status === "draft" ? "active" : "sold";
  const actionLabel = listing.status === "draft" ? "Activate listing" : "Mark as sold";
  const handleStatusUpdate = () => {
    void dispatch(updateListingStatus({ id: listing.id, status: nextStatus }));
  };

  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/" sx={{ alignSelf: "flex-start" }}>
        Back to marketplace
      </Button>
      <Stack spacing={1}>
        <Typography variant="h1">{listing.title}</Typography>
        <Typography color="text.secondary">{listing.category}</Typography>
        <Box>
          <Chip
            label={statusLabels[listing.status]}
            color={statusColors[listing.status]}
          />
        </Box>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          component={RouterLink}
          to={`/listings/${listing.id}/edit`}
          variant="contained"
          disabled={statusUpdateStatus === "loading"}
        >
          Edit listing
        </Button>
        {listing.status !== "sold" && (
          <Button
            variant="outlined"
            onClick={() => {
              if (listing.status === "active") {
                setIsSoldDialogOpen(true);
              } else {
                handleStatusUpdate();
              }
            }}
            disabled={statusUpdateStatus === "loading"}
            startIcon={
              statusUpdateStatus === "loading" ? <CircularProgress size={18} /> : undefined
            }
          >
            {statusUpdateStatus === "loading" ? "Updating..." : actionLabel}
          </Button>
        )}
      </Stack>
      {statusUpdateStatus === "succeeded" && (
        <Alert severity="success">
          Listing status updated to {statusLabels[listing.status].toLowerCase()}.
        </Alert>
      )}
      {statusUpdateStatus === "failed" && statusUpdateError && (
        <Alert severity="error">{statusUpdateError}</Alert>
      )}
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
          <strong>Status:</strong> {statusLabels[listing.status]}
        </Typography>
      </Stack>
      <Dialog
        open={isSoldDialogOpen}
        onClose={() => setIsSoldDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Mark listing as sold?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will mark the listing as sold and it cannot be reactivated.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSoldDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsSoldDialogOpen(false);
              handleStatusUpdate();
            }}
            disabled={statusUpdateStatus === "loading"}
          >
            Mark as sold
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
