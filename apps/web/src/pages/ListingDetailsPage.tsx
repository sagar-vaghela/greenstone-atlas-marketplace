import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { ListingStatus } from "@atlas/types";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import { OfferPanel } from "../components/listings/OfferPanel";
import { SellerCard } from "../components/listings/SellerCard";
import {
  fetchListingById,
  selectStatusUpdateError,
  selectStatusUpdateStatus,
  selectDetailStatus,
  selectListingsError,
  selectSelectedListing,
  updateListingStatus,
} from "../features/listings/listingsSlice";
import { PriceDisplay } from "../components/common/PriceDisplay";
import { StatusChip } from "../components/common/StatusChip";
import { LoadingState } from "../components/common/LoadingState";
import { BackToMarketplaceButton } from "../components/common/BackToMarketplaceButton";
import { MessageSellerButton } from "../components/listings/MessageSellerButton";

const statusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  sold: "Sold",
};

export function ListingDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const listing = useAppSelector(selectSelectedListing);
  const currentUser = useAppSelector(selectCurrentUser);
  const detailStatus = useAppSelector(selectDetailStatus);
  const error = useAppSelector(selectListingsError);
  const statusUpdateStatus = useAppSelector(selectStatusUpdateStatus);
  const statusUpdateError = useAppSelector(selectStatusUpdateError);
  const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
        <LoadingState label="Loading listing" skeleton />
      </Box>
    );
  }

  if (detailStatus === "failed" && error === "Listing not found") {
    return (
      <Stack spacing={2}>
        <Typography variant="h1">Listing not found</Typography>
        <BackToMarketplaceButton />
      </Stack>
    );
  }

  if (detailStatus === "failed" || !listing) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          Unable to load this listing. Please try again.
        </Alert>
        <BackToMarketplaceButton />
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
  const gallery =
    images.length === 0 ? (
      <Box
        sx={{
          aspectRatio: "4 / 3",
          display: "grid",
          placeItems: "center",
          bgcolor: "action.hover",
          color: "text.secondary",
        }}
      >
        <Typography>No images available for this listing.</Typography>
      </Box>
    ) : (
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Button
          onClick={() => setIsLightboxOpen(true)}
          aria-label={`Open ${imageAlt} in full screen`}
          sx={{ p: 0, display: "block", textTransform: "none", minWidth: 0 }}
        >
          {failedImages.has(selectedImage.url) ? (
            <Box
              sx={{
                aspectRatio: "4 / 3",
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
                aspectRatio: "4 / 3",
                objectFit: "contain",
                bgcolor: "action.hover",
              }}
            />
          )}
        </Button>
        <Stack
          direction="row"
          spacing={1}
          sx={{ overflowX: "auto", pb: 1, maxWidth: "100%" }}
        >
          {images.map((image, index) => (
            <Button
              key={image.url}
              onClick={() => setSelectedImageIndex(index)}
              aria-label={`Show ${image.alt || `${listing.title} image ${index + 1}`}`}
              aria-current={index === selectedImageIndex ? "true" : undefined}
              sx={{
                flex: "0 0 88px",
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
    );

  return (
    <Stack spacing={3}>
      <BackToMarketplaceButton />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1.35fr) minmax(300px, 0.75fr)",
          },
          gap: { xs: 3, md: 5 },
          alignItems: "start",
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {gallery}
          <Box
            component="section"
            aria-labelledby="listing-description-heading"
          >
            <Typography
              id="listing-description-heading"
              variant="h5"
              component="h2"
              sx={{ mb: 1 }}
            >
              Details
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {listing.description}
            </Typography>
          </Box>
        </Stack>
        <Stack
          spacing={2.5}
          sx={{ minWidth: 0, position: { md: "sticky" }, top: { md: 3 } }}
        >
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {listing.category}
            </Typography>
            <Typography
              variant="h1"
              component="h1"
              sx={{ overflowWrap: "anywhere" }}
            >
              {listing.title}
            </Typography>
            <PriceDisplay
              amount={listing.price}
              currency={listing.currency}
              variant="h4"
              sx={{ color: "primary.main" }}
            />
            <Box>
              <StatusChip status={listing.status} />
            </Box>
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ pt: 0.5, flexWrap: "wrap" }}
            >
              <Typography variant="body2" color="text.secondary">
                Currency: {listing.currency}
              </Typography>
              {listing.condition && (
                <Typography variant="body2" color="text.secondary">
                  Condition: {listing.condition}
                </Typography>
              )}
              {listing.year && (
                <Typography variant="body2" color="text.secondary">
                  Year: {listing.year}
                </Typography>
              )}
              {listing.location && (
                <Typography variant="body2" color="text.secondary">
                  Location: {listing.location}
                </Typography>
              )}
            </Stack>
          </Stack>
          <SellerCard sellerId={listing.sellerId} />
          <MessageSellerButton
            listingId={listing.id}
            sellerId={listing.sellerId}
          />
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
          {(currentUser?.id === listing.sellerId ||
            statusUpdateStatus === "succeeded" ||
            statusUpdateError) && (
            <Stack spacing={1}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
                {currentUser?.id === listing.sellerId &&
                  listing.status !== "sold" && (
                    <Button
                      variant="outlined"
                      onClick={() =>
                        listing.status === "active"
                          ? setIsSoldDialogOpen(true)
                          : handleStatusUpdate()
                      }
                      disabled={statusUpdateStatus === "loading"}
                      startIcon={
                        statusUpdateStatus === "loading" ? (
                          <CircularProgress size={18} />
                        ) : undefined
                      }
                    >
                      {statusUpdateStatus === "loading"
                        ? "Updating..."
                        : actionLabel}
                    </Button>
                  )}
              </Stack>
              {statusUpdateStatus === "succeeded" && (
                <Alert severity="success">
                  Listing status updated to{" "}
                  {statusLabels[listing.status].toLowerCase()}.
                </Alert>
              )}
              {statusUpdateStatus === "failed" && statusUpdateError && (
                <Alert severity="error">{statusUpdateError}</Alert>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
      <Dialog
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        fullScreen={isMobile}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ overflowWrap: "anywhere" }}>{imageAlt}</DialogTitle>
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
