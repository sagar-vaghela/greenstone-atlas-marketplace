import { useState } from "react";
import { Alert, Button, MenuItem, Paper, Stack, TextField } from "@mui/material";
import type {
  CreateListingInput,
  ListingImage,
  UpdateListingInput,
} from "@atlas/types";
import { Link as RouterLink } from "react-router-dom";
import { ListingImageManager } from "./ListingImageManager";

export type ListingFormValues = Record<
  Exclude<keyof CreateListingInput, "images" | "saleMode">,
  string
> & {
  saleMode?: string;
  images: ListingImage[];
};
export type ListingFormFieldErrors = Partial<Record<keyof ListingFormValues, string>>;
export type ListingFormData = CreateListingInput | UpdateListingInput;

interface ValidationResult<T extends ListingFormData> {
  data: T | undefined;
  errors: ListingFormFieldErrors;
}

interface ListingFormProps<T extends ListingFormData> {
  initialValues: ListingFormValues;
  validate: (values: ListingFormValues) => ValidationResult<T>;
  onSubmit: (data: T) => Promise<void>;
  error: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  cancelTo: string;
}

export function ListingForm<T extends ListingFormData>({
  initialValues,
  validate,
  onSubmit,
  error,
  isSubmitting,
  submitLabel,
  submittingLabel,
  cancelTo,
}: ListingFormProps<T>) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ListingFormFieldErrors>({});

  const updateField = (field: keyof ListingFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validate(values);
    setFieldErrors(result.errors);
    if (!result.data) {
      return;
    }

    await onSubmit(result.data);
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      noValidate
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Title"
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          error={Boolean(fieldErrors.title)}
          helperText={fieldErrors.title ?? "Give your listing a clear name."}
          required
          fullWidth
        />
        <TextField
          label="Description"
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          error={Boolean(fieldErrors.description)}
          helperText={fieldErrors.description ?? "Describe the item and its condition."}
          required
          fullWidth
          multiline
          minRows={4}
        />
        <TextField
          select
          label="Sale mode"
          value={values.saleMode ?? "fixed_price"}
          onChange={(event) => updateField("saleMode", event.target.value)}
          helperText="Choose fixed-price offers or auction bidding."
          fullWidth
        >
          <MenuItem value="fixed_price">Fixed price offers</MenuItem>
          <MenuItem value="auction">Auction</MenuItem>
        </TextField>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Brand"
            value={values.brand}
            onChange={(event) => updateField("brand", event.target.value)}
            error={Boolean(fieldErrors.brand)}
            helperText={fieldErrors.brand}
            fullWidth
          />
          <TextField
            label="Model"
            value={values.model}
            onChange={(event) => updateField("model", event.target.value)}
            error={Boolean(fieldErrors.model)}
            helperText={fieldErrors.model}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Reference number"
            value={values.referenceNumber}
            onChange={(event) => updateField("referenceNumber", event.target.value)}
            error={Boolean(fieldErrors.referenceNumber)}
            helperText={fieldErrors.referenceNumber}
            fullWidth
          />
          <TextField
            label="Condition"
            value={values.condition}
            onChange={(event) => updateField("condition", event.target.value)}
            error={Boolean(fieldErrors.condition)}
            helperText={fieldErrors.condition}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Year"
            value={values.year}
            onChange={(event) => updateField("year", event.target.value)}
            error={Boolean(fieldErrors.year)}
            helperText={fieldErrors.year}
            type="number"
            slotProps={{ htmlInput: { min: 1900, max: 2100, step: 1 } }}
            fullWidth
          />
          <TextField
            label="Location"
            value={values.location}
            onChange={(event) => updateField("location", event.target.value)}
            error={Boolean(fieldErrors.location)}
            helperText={fieldErrors.location}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Price"
            value={values.price}
            onChange={(event) => updateField("price", event.target.value)}
            error={Boolean(fieldErrors.price)}
            helperText={fieldErrors.price}
            required
            fullWidth
            type="number"
            slotProps={{ htmlInput: { min: 0, step: "any" } }}
          />
          <TextField
            label="Currency"
            value={values.currency}
            onChange={(event) => updateField("currency", event.target.value)}
            error={Boolean(fieldErrors.currency)}
            helperText={fieldErrors.currency}
            required
            fullWidth
          />
        </Stack>
        <TextField
          label="Category"
          value={values.category}
          onChange={(event) => updateField("category", event.target.value)}
          error={Boolean(fieldErrors.category)}
          helperText={fieldErrors.category}
          required
          fullWidth
        />
        <ListingImageManager
          images={values.images}
          onChange={(images) => {
            setValues((current) => ({ ...current, images }));
            setFieldErrors((current) => ({ ...current, images: undefined }));
          }}
          error={fieldErrors.images}
          disabled={isSubmitting}
        />
        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "flex-end",
          }}
        >
          <Button component={RouterLink} to={cancelTo} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
