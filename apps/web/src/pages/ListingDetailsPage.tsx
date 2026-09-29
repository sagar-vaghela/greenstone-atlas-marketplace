import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardMedia,
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
import { selectCurrentUser } from "../features/auth/authSlice";
import { OfferPanel } from "../components/listings/OfferPanel";
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
  const currentUser = useAppSelector(selectCurrentUser);
  const detailStatus = useAppSelector(selectDetailStatus);
  const error = useAppSelector(selectListingsError);
  const statusUpdateStatus = useAppSelector(selectStatusUpdateStatus);
  const statusUpdateError = useAppSelector(selectStatusUpdateError);
  const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      void dispatch(fetchListingById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isLightboxOpen]);

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
  const actionLabel =
    listing.status === "draft" ? "Activate listing" : "Mark as sold";
  const handleStatusUpdate = () => {
    void dispatch(updateListingStatus({ id: listing.id, status: nextStatus }));
  };
  const images = listing.images ?? [];
  const selectedImage = images[selectedImageIndex];
  const imageAlt = selectedImage?.alt || listing.title;
  const markImageFailed = (url: string) => {
    setFailedImages((current) => new Set(current).add(url));
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
      {currentUser ? (
        <OfferPanel
          listing={listing}
          onAccepted={() => void dispatch(fetchListingById(listing.id))}
        />
      ) : (
        <Alert
          severity="info"
          action={
            <Button
              component={RouterLink}
              to={`/login?returnTo=${encodeURIComponent(`/listings/${listing.id}`)}`}
            >
              Sign in
            </Button>
          }
        >
          Please sign in to make or manage offers.
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {currentUser?.id === listing.sellerId && (
          <Button
            component={RouterLink}
            to={`/listings/${listing.id}/edit`}
            variant="contained"
            disabled={statusUpdateStatus === "loading"}
          >
            Edit listing
          </Button>
        )}
        {currentUser?.id === listing.sellerId && listing.status !== "sold" && (
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
              statusUpdateStatus === "loading" ? (
                <CircularProgress size={18} />
              ) : undefined
            }
          >
            {statusUpdateStatus === "loading" ? "Updating..." : actionLabel}
          </Button>
        )}
      </Stack>
      {statusUpdateStatus === "succeeded" && (
        <Alert severity="success">
          Listing status updated to {statusLabels[listing.status].toLowerCase()}
          .
        </Alert>
      )}
      {statusUpdateStatus === "failed" && statusUpdateError && (
        <Alert severity="error">{statusUpdateError}</Alert>
      )}
      <Divider />
      {images.length === 0 ? (
        <Box
          sx={{
            aspectRatio: { xs: "4 / 3", sm: "16 / 9" },
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          <Typography>No images available for this listing.</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          <Button
            onClick={() => setIsLightboxOpen(true)}
            aria-label={`Open ${imageAlt} in full screen`}
            sx={{ p: 0, display: "block", textTransform: "none" }}
          >
            {failedImages.has(selectedImage.url) ? (
              <Box
                sx={{
                  aspectRatio: { xs: "4 / 3", sm: "16 / 9" },
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color: "text.secondary",
                }}
              >
                <Typography>Image preview unavailable</Typography>
              </Box>
            ) : (
              <CardMedia
                component="img"
                image={selectedImage.url}
                alt={imageAlt}
                onError={() => markImageFailed(selectedImage.url)}
                sx={{
                  aspectRatio: { xs: "4 / 3", sm: "16 / 9" },
                  objectFit: "contain",
                  bgcolor: "action.hover",
                }}
              />
            )}
          </Button>
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
            {images.map((image, index) => (
              <Button
                key={image.url}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`Show ${image.alt || `${listing.title} image ${index + 1}`}`}
                aria-current={index === selectedImageIndex ? "true" : undefined}
                sx={{
                  minWidth: 88,
                  width: 88,
                  p: 0.5,
                  border: 2,
                  borderColor:
                    index === selectedImageIndex ? "primary.main" : "divider",
                  bgcolor: "background.paper",
                }}
              >
                {failedImages.has(image.url) ? (
                  <Box
                    sx={{
                      aspectRatio: "1",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Typography variant="caption">Unavailable</Typography>
                  </Box>
                ) : (
                  <CardMedia
                    component="img"
                    image={image.url}
                    alt={image.alt || `${listing.title} thumbnail ${index + 1}`}
                    onError={() => markImageFailed(image.url)}
                    sx={{ aspectRatio: "1", objectFit: "cover" }}
                  />
                )}
              </Button>
            ))}
          </Stack>
        </Stack>
      )}
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
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{imageAlt}</DialogTitle>
        <DialogContent>
          {selectedImage && !failedImages.has(selectedImage.url) && (
            <CardMedia
              component="img"
              image={selectedImage.url}
              alt={imageAlt}
              onError={() => markImageFailed(selectedImage.url)}
              sx={{ maxHeight: "70vh", objectFit: "contain" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLightboxOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
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
