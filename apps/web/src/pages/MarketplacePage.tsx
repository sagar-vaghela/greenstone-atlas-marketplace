import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import type { Listing, ListingQuery, ListingSort } from "@atlas/types";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useDebouncedValue } from "../app/useDebouncedValue";
import {
  fetchListings,
  selectListings,
  selectListingsError,
  selectListStatus,
} from "../features/listings/listingsSlice";

const formatPrice = (listing: Listing) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.price);

const statusLabels = {
  draft: "Draft",
  active: "Active",
  sold: "Sold",
} as const;

export function MarketplacePage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const listings = useAppSelector(selectListings);
  const listStatus = useAppSelector(selectListStatus);
  const error = useAppSelector(selectListingsError);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const query = useMemo<ListingQuery>(() => {
    const minPriceValue = searchParams.get("minPrice");
    const maxPriceValue = searchParams.get("maxPrice");
    const minPrice = Number(minPriceValue);
    const maxPrice = Number(maxPriceValue);
    const sort = searchParams.get("sort");

    return {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      minPrice:
        minPriceValue !== null && Number.isFinite(minPrice)
          ? minPrice
          : undefined,
      maxPrice:
        maxPriceValue !== null && Number.isFinite(maxPrice)
          ? maxPrice
          : undefined,
      sort:
        sort === "newest" ||
        sort === "oldest" ||
        sort === "price_asc" ||
        sort === "price_desc"
          ? sort
          : undefined,
    };
  }, [searchParams]);

  useEffect(() => {
    setAvailableCategories((currentCategories) =>
      Array.from(
        new Set([
          ...currentCategories,
          ...listings.map((listing) => listing.category),
        ]),
      ).sort(),
    );
  }, [listings]);

  const categories = query.category
    ? Array.from(new Set([...availableCategories, query.category])).sort()
    : availableCategories;

  const hasFilters = queryString.length > 0;

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const clearFilters = () => setSearchParams({}, { replace: true });
  const loadListings = () => void dispatch(fetchListings(query));

  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [queryString, searchParams]);

  useEffect(() => {
    if (debouncedSearch !== (searchParams.get("search") ?? "")) {
      updateParam("search", debouncedSearch.trim());
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void dispatch(fetchListings(query));
  }, [dispatch, queryString]);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h1">Atlas Marketplace</Typography>
        <Typography color="text.secondary">
          Browse the latest listings from the marketplace.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <TextField
          label="Search listings"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          fullWidth
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              label="Category"
              value={query.category ?? ""}
              onChange={(event) => updateParam("category", event.target.value)}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Minimum price"
            type="number"
            value={searchParams.get("minPrice") ?? ""}
            onChange={(event) => updateParam("minPrice", event.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            fullWidth
          />
          <TextField
            label="Maximum price"
            type="number"
            value={searchParams.get("maxPrice") ?? ""}
            onChange={(event) => updateParam("maxPrice", event.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="sort-label">Sort</InputLabel>
            <Select
              labelId="sort-label"
              label="Sort"
              value={query.sort ?? "newest"}
              onChange={(event) =>
                updateParam("sort", event.target.value as ListingSort)
              }
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
              <MenuItem value="price_asc">Price: low to high</MenuItem>
              <MenuItem value="price_desc">Price: high to low</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {hasFilters && (
          <Box>
            <Button onClick={clearFilters}>Clear filters</Button>
          </Box>
        )}
      </Stack>

      {listStatus === "loading" && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            py: 6,
          }}
        >
          <CircularProgress aria-label="Loading listings" />
          <Typography color="text.secondary">Loading listings...</Typography>
        </Box>
      )}

      {listStatus === "failed" && (
        <Alert
          severity="error"
          action={<Button onClick={loadListings}>Try again</Button>}
        >
          {error ?? "Unable to load listings."} Please try again.
        </Alert>
      )}

      {listStatus === "succeeded" && listings.length === 0 && (
        <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
          <Typography variant="h5">No listings found</Typography>
          <Typography color="text.secondary">
            Try adjusting your search or filters.
          </Typography>
          {hasFilters && <Button onClick={clearFilters}>Clear filters</Button>}
        </Stack>
      )}

      {listings.length > 0 && listStatus !== "idle" && (
        <Stack spacing={2}>
          {listings.map((listing) => (
            <Card key={listing.id} variant="outlined">
              <CardActionArea
                component={RouterLink}
                to={`/listings/${listing.id}`}
              >
                {listing.images?.[0] &&
                !failedImages.has(listing.images[0].url) ? (
                  <CardMedia
                    component="img"
                    image={listing.images[0].url}
                    alt={listing.images[0].alt || listing.title}
                    onError={() =>
                      setFailedImages((current) =>
                        new Set(current).add(listing.images[0].url),
                      )
                    }
                    sx={{ aspectRatio: "16 / 9", objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    sx={{
                      aspectRatio: "16 / 9",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "action.hover",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="body2">No image available</Typography>
                  </Box>
                )}
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
                  >
                    <Typography variant="h5" component="h2">
                      {listing.title}
                    </Typography>
                    <Chip
                      label={statusLabels[listing.status]}
                      size="small"
                      color={
                        listing.status === "active" ? "success" : "default"
                      }
                    />
                  </Stack>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {formatPrice(listing)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {listing.category}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
