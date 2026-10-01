import { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { Listing } from "@atlas/types";
import { PriceDisplay } from "../common/PriceDisplay";
import { StatusChip } from "../common/StatusChip";

export function ListingCard({ listing }: { listing: Listing }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const cover = listing.images?.[0];

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        transition: "box-shadow 180ms ease, transform 180ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={`/listings/${listing.id}`}
        sx={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {cover && !failedImages.has(cover.url) ? (
          <CardMedia
            component="img"
            image={cover.url}
            alt={cover.alt || listing.title}
            onError={() =>
              setFailedImages((current) => new Set(current).add(cover.url))
            }
            sx={{
              aspectRatio: "4 / 3",
              objectFit: "contain",
              bgcolor: "action.hover",
              p: { xs: 1, sm: 2 },
            }}
          />
        ) : (
          <Box
            sx={{
              aspectRatio: "4 / 3",
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              color: "text.secondary",
            }}
          >
            <Typography variant="body2">No image available</Typography>
          </Box>
        )}
        <CardContent sx={{ flex: 1, width: "100%", pb: 1.5 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "flex-start",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.35 }}
            >
              {listing.title}
            </Typography>
            <StatusChip status={listing.status} />
          </Stack>
          <PriceDisplay
            amount={listing.price}
            currency={listing.currency}
            variant="h6"
            sx={{ mt: 1.25, color: "primary.main" }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, overflowWrap: "anywhere" }}
          >
            {listing.category}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Link
          component={RouterLink}
          to={`/sellers/${listing.sellerId}`}
          underline="hover"
          color="text.secondary"
          variant="body2"
        >
          View seller profile
        </Link>
      </Box>
    </Card>
  );
}
