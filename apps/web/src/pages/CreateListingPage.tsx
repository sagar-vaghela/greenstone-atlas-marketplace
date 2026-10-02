import { useEffect } from "react";
import { Stack, Typography } from "@mui/material";
import type { CreateListingInput } from "@atlas/types";
import { createListingSchema } from "@atlas/validation";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { BackToMarketplaceButton } from "../components/common/BackToMarketplaceButton";
import {
  ListingForm,
  type ListingFormFieldErrors,
  type ListingFormValues,
} from "../components/listings/ListingForm";
import {
  createListing,
  resetCreateState,
  selectCreateError,
  selectCreateStatus,
} from "../features/listings/listingsSlice";

const initialValues: ListingFormValues = {
  title: "",
  brand: "",
  model: "",
  referenceNumber: "",
  description: "",
  condition: "",
  year: "",
  location: "",
  price: "",
  currency: "AED",
  category: "",
  saleMode: "fixed_price",
  images: [],
};

export function CreateListingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const createStatus = useAppSelector(selectCreateStatus);
  const createError = useAppSelector(selectCreateError);

  useEffect(() => {
    dispatch(resetCreateState());
  }, [dispatch]);

  const isSubmitting = createStatus === "loading";

  const validate = (values: ListingFormValues) => {
    const result = createListingSchema.safeParse({
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
          !errors[field as keyof CreateListingInput]
        ) {
          errors[field as keyof CreateListingInput] = issue.message;
        }
      }
    }
    return { data: result.success ? result.data : undefined, errors };
  };

  const handleSubmit = async (input: CreateListingInput) => {
    try {
      const listing = await dispatch(createListing(input)).unwrap();
      navigate(`/listings/${listing.id}`);
    } catch {
      // The rejected thunk stores a serializable message for the form alert.
    }
  };

  return (
    <Stack spacing={3}>
      <BackToMarketplaceButton />
      <Stack spacing={1}>
        <Typography variant="h1">Create a listing</Typography>
        <Typography color="text.secondary">
          Add the details buyers need to understand your item.
        </Typography>
      </Stack>
      <ListingForm
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
        error={createStatus === "failed" ? createError : null}
        isSubmitting={isSubmitting}
        submitLabel="Create listing"
        submittingLabel="Creating..."
        cancelTo="/"
      />
    </Stack>
  );
}
