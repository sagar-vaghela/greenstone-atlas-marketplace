import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ListingImage } from "@atlas/types";

const MAX_IMAGES = 8;

interface ListingImageManagerProps {
  images: ListingImage[];
  onChange: (images: ListingImage[]) => void;
  error?: string;
  disabled?: boolean;
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function ListingImageManager({
  images,
  onChange,
  error,
  disabled = false,
}: ListingImageManagerProps) {
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const addImage = () => {
    const trimmedUrl = url.trim();
    if (!isHttpUrl(trimmedUrl)) {
      setInputError("Enter a valid HTTP or HTTPS image URL.");
      return;
    }
    if (images.some((image) => image.url === trimmedUrl)) {
      setInputError("That image URL has already been added.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setInputError("You can add up to 8 images.");
      return;
    }

    onChange([...images, { url: trimmedUrl }]);
    setUrl("");
    setInputError(null);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_image, imageIndex) => imageIndex !== index));
  };

  const setCover = (index: number) => {
    if (index === 0) return;
    onChange([
      images[index],
      ...images.filter((_image, imageIndex) => imageIndex !== index),
    ]);
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h6">Listing images</Typography>
        <Typography variant="body2" color="text.secondary">
          Add up to 8 images. The first image will be used as the cover image.
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Image URL"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setInputError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addImage();
            }
          }}
          error={Boolean(inputError || error)}
          helperText={inputError || error}
          disabled={disabled}
          fullWidth
        />
        <Button variant="outlined" onClick={addImage} disabled={disabled}>
          Add
        </Button>
      </Stack>
      {images.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {images.map((image, index) => (
            <Card key={image.url} variant="outlined">
              {failedImages.has(image.url) ? (
                <Box
                  sx={{
                    aspectRatio: "4 / 3",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "action.hover",
                    color: "text.secondary",
                    p: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2">Preview unavailable</Typography>
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  image={image.url}
                  alt={image.alt || "Listing preview"}
                  onError={() =>
                    setFailedImages((current) =>
                      new Set(current).add(image.url),
                    )
                  }
                  sx={{ aspectRatio: "4 / 3", objectFit: "cover" }}
                />
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ p: 1, alignItems: { xs: "stretch", sm: "center" } }}
              >
                <Chip
                  label={index === 0 ? "Cover" : `Image ${index + 1}`}
                  color={index === 0 ? "primary" : "default"}
                  size="small"
                />
                <Box sx={{ flexGrow: 1 }} />
                {index !== 0 && (
                  <Button
                    size="small"
                    onClick={() => setCover(index)}
                    disabled={disabled}
                  >
                    Set cover
                  </Button>
                )}
                <Button
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => removeImage(index)}
                  disabled={disabled}
                  size="small"
                >
                  Remove
                </Button>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
      {!images.length && <Alert severity="info">No images added yet.</Alert>}
    </Stack>
  );
}
