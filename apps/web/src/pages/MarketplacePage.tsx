import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Stack,
  Typography,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import type { Listing, ListingQuery, ListingSort } from "@atlas/types";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useDebouncedValue } from "../app/useDebouncedValue";
import {
  fetchListings,
  selectListings,
  selectListingsError,
  selectListStatus,
} from "../features/listings/listingsSlice";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { PageHeader } from "../components/common/PageHeader";
import { ListingCard } from "../components/listings/ListingCard";

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
      <Box
        sx={{ borderBottom: 1, borderColor: "divider", pb: { xs: 4, md: 6 } }}
      >
        <PageHeader
          eyebrow="The considered collection"
          title="Find the watch that stays with you."
          description="A curated marketplace for pre-owned watches, with clear provenance and thoughtful sellers."
        />
        <TextField
          label="Search the collection"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TuneIcon color="action" />
          <Typography variant="h6">Refine your search</Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
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
        <LoadingState
          label="Loading listings"
          skeleton={listings.length === 0}
        />
      )}

      {listStatus === "failed" && (
        <ErrorState
          message={error ?? "Unable to load listings."}
          onRetry={loadListings}
        />
      )}

      {listStatus === "succeeded" && listings.length === 0 && (
        <EmptyState
          title="No watches found"
          description="Try adjusting your search or filters."
          action={
            hasFilters ? (
              <Button onClick={clearFilters}>Clear filters</Button>
            ) : undefined
          }
        />
      )}

      {listings.length > 0 && listStatus !== "idle" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Box>
      )}
    </Stack>
  );
}
