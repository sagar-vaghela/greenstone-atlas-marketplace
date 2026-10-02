import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import type { UpdateListingInput } from "@atlas/types";
import { updateListingSchema } from "@atlas/validation";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchListingById,
  resetUpdateState,
  selectDetailStatus,
  selectListingsError,
  selectSelectedListing,
  selectUpdateError,
  selectUpdateStatus,
  updateListing,
} from "../features/listings/listingsSlice";
import {
  ListingForm,
  type ListingFormFieldErrors,
  type ListingFormValues,
} from "../components/listings/ListingForm";

export function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const listing = useAppSelector(selectSelectedListing);
  const detailStatus = useAppSelector(selectDetailStatus);
  const detailError = useAppSelector(selectListingsError);
  const updateStatus = useAppSelector(selectUpdateStatus);
  const updateError = useAppSelector(selectUpdateError);

  useEffect(() => {
    dispatch(resetUpdateState());
    if (id) {
      void dispatch(fetchListingById(id));
    }
  }, [dispatch, id]);

  if (detailStatus === "idle" || detailStatus === "loading") {
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

  if (detailStatus === "failed" || !listing || listing.id !== id) {
    const notFound = detailError === "Listing not found";
    return (
      <Stack spacing={2}>
        <Typography variant="h1">
          {notFound ? "Listing not found" : "Unable to edit listing"}
        </Typography>
        {!notFound && (
          <Alert severity="error">
            {detailError ?? "Unable to load this listing. Please try again."}
          </Alert>
        )}
        <Button
          component={RouterLink}
          to={id ? `/listings/${id}` : "/"}
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
        >
          Back to listing
        </Button>
      </Stack>
    );
  }

  const initialValues: ListingFormValues = {
    title: listing.title,
    brand: listing.brand ?? "",
    model: listing.model ?? "",
    referenceNumber: listing.referenceNumber ?? "",
    description: listing.description,
    condition: listing.condition ?? "",
    year: listing.year === undefined ? "" : String(listing.year),
    location: listing.location ?? "",
    price: String(listing.price),
    currency: listing.currency,
    category: listing.category,
    saleMode: listing.saleMode ?? "fixed_price",
    images: listing.images ?? [],
  };

  const validate = (values: ListingFormValues) => {
    const result = updateListingSchema.safeParse({
      ...values,
      price: values.price === "" ? Number.NaN : Number(values.price),
      year: values.year === "" ? undefined : Number(values.year),
    });
    const errors: ListingFormFieldErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (
          typeof field === "string" &&
          Object.prototype.hasOwnProperty.call(initialValues, field) &&
          !errors[field as keyof ListingFormValues]
        ) {
          errors[field as keyof ListingFormValues] = issue.message;
        }
      }
    }
    return {
      data: result.success ? result.data : undefined,
      errors,
    };
  };

  const handleSubmit = async (input: UpdateListingInput) => {
    try {
      await dispatch(updateListing({ id: listing.id, input })).unwrap();
      navigate(`/listings/${listing.id}`);
    } catch {
      // The rejected thunk stores a serializable message for the form alert.
    }
  };

  return (
    <Stack spacing={3}>
      <Button
        component={RouterLink}
        to={`/listings/${listing.id}`}
        sx={{ alignSelf: "flex-start" }}
      >
        Back to listing
      </Button>
      <Stack spacing={1}>
        <Typography variant="h1">Edit listing</Typography>
        <Typography color="text.secondary">
          Keep your listing details accurate for marketplace buyers.
        </Typography>
      </Stack>
      <ListingForm
        key={listing.id}
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
        error={updateStatus === "failed" ? updateError : null}
        isSubmitting={updateStatus === "loading"}
        submitLabel="Save changes"
        submittingLabel="Saving..."
        cancelTo={`/listings/${listing.id}`}
      />
    </Stack>
  );
}
