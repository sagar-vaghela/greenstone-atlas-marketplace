import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CreateListingInput } from "@atlas/types";
import { createListingSchema } from "@atlas/validation";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  createListing,
  resetCreateState,
  selectCreateError,
  selectCreateStatus,
} from "../features/listings/listingsSlice";

type FormValues = Record<keyof CreateListingInput, string>;
type FieldErrors = Partial<Record<keyof CreateListingInput, string>>;

const initialValues: FormValues = {
  title: "",
  description: "",
  price: "",
  currency: "INR",
  category: "",
};

export function CreateListingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const createStatus = useAppSelector(selectCreateStatus);
  const createError = useAppSelector(selectCreateError);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    dispatch(resetCreateState());
  }, [dispatch]);

  const updateField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = createListingSchema.safeParse({
      ...values,
      price: values.price === "" ? Number.NaN : Number(values.price),
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (
          typeof field === "string" &&
          field in initialValues &&
          !errors[field as keyof CreateListingInput]
        ) {
          errors[field as keyof CreateListingInput] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    try {
      const listing = await dispatch(createListing(result.data)).unwrap();
      navigate(`/listings/${listing.id}`);
    } catch {
      // The rejected thunk stores a serializable message for the form alert.
    }
  };

  const isSubmitting = createStatus === "loading";

  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/" sx={{ alignSelf: "flex-start" }}>
        Back to marketplace
      </Button>
      <Stack spacing={1}>
        <Typography variant="h1">Create a listing</Typography>
        <Typography color="text.secondary">
          Add the details buyers need to understand your item.
        </Typography>
      </Stack>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        variant="outlined"
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={3}>
          {createStatus === "failed" && (
            <Alert severity="error">{createError}</Alert>
          )}
          <TextField
            label="Title"
            value={values.title}
            onChange={(event) => updateField("title", event.target.value)}
            error={Boolean(fieldErrors.title)}
            helperText={fieldErrors.title ?? "Give your listing a clear name."}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Description"
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            error={Boolean(fieldErrors.description)}
            helperText={
              fieldErrors.description ?? "Describe the item and its condition."
            }
            required
            fullWidth
            multiline
            minRows={4}
          />
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
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: "flex-end" }}
          >
            <Button component={RouterLink} to="/" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create listing"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
