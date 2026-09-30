import { useEffect, useState } from "react";
import type { Listing, Offer, OfferStatus } from "@atlas/types";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { PriceDisplay } from "../common/PriceDisplay";
import { StatusChip } from "../common/StatusChip";
import { selectRealtime } from "../../features/realtime/realtimeSlice";
import { selectCurrentUser } from "../../features/auth/authSlice";
import {
  counterOffer,
  createOffer,
  fetchOffers,
  offerAction,
  selectOfferMutationError,
  selectOfferMutationStatus,
  selectOffers,
  selectOffersError,
  selectOffersStatus,
} from "../../features/offers/offersSlice";

interface Props {
  listing: Listing;
  onAccepted: () => void;
}
export function OfferPanel({ listing, onAccepted }: Props) {
  const dispatch = useAppDispatch();
  const offers = useAppSelector(selectOffers);
  const listStatus = useAppSelector(selectOffersStatus);
  const listError = useAppSelector(selectOffersError);
  const mutationStatus = useAppSelector(selectOfferMutationStatus);
  const mutationError = useAppSelector(selectOfferMutationError);
  const realtimeStatus = useAppSelector(selectRealtime).connectionStatus;
  const [amount, setAmount] = useState("");
  const [counterTarget, setCounterTarget] = useState<Offer | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [acceptTarget, setAcceptTarget] = useState<Offer | null>(null);

  useEffect(() => {
    void dispatch(fetchOffers(listing.id));
  }, [dispatch, listing.id, realtimeStatus]);
  const currentUser = useAppSelector(selectCurrentUser);
  const isSeller = currentUser?.id === listing.sellerId;
  const visibleOffers = isSeller
    ? offers
    : offers.filter((offer) => offer.buyerId === currentUser?.id);
  const submitOffer = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    void dispatch(
      createOffer({
        listingId: listing.id,
        amount: parsedAmount,
        currency: listing.currency,
      }),
    );
    setAmount("");
  };
  const act = (offer: Offer, status: "accepted" | "rejected" | "withdrawn") => {
    void dispatch(offerAction({ id: offer.id, status })).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        setAcceptTarget(null);
        void dispatch(fetchOffers(listing.id));
        if (status === "accepted") onAccepted();
      }
    });
  };
  const submitCounter = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !counterTarget ||
      !Number.isFinite(Number(counterAmount)) ||
      Number(counterAmount) <= 0
    )
      return;
    const handleSuccess = (result: { meta: { requestStatus: string } }) => {
      if (result.meta.requestStatus === "fulfilled") {
        setCounterTarget(null);
        setCounterAmount("");
        void dispatch(fetchOffers(listing.id));
      }
    };
    void dispatch(
      counterOffer({
        id: counterTarget.id,
        amount: Number(counterAmount),
        currency: listing.currency,
      }),
    ).then(handleSuccess);
  };

  return (
    <Stack spacing={2} component="section" aria-labelledby="offers-heading">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", gap: 2 }}
      >
        <Box>
          <Typography id="offers-heading" variant="h4">
            Offers for this watch
          </Typography>
          <Typography color="text.secondary">
            Asking price: {new Intl.NumberFormat("en-IN", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(listing.price)}
          </Typography>
        </Box>
        {currentUser && (
          <Typography variant="body2" color="text.secondary">
            {isSeller ? "Seller view" : "Buyer view"}
          </Typography>
        )}
      </Stack>
      {currentUser && !isSeller && listing.status === "active" && (
        <Card variant="outlined">
          <CardContent component="form" onSubmit={submitOffer}>
            <Typography variant="h6">Make an offer</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "flex-start" }, mt: 2 }}
            >
              <TextField
                label={`Amount (${listing.currency})`}
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                slotProps={{ htmlInput: { min: 1, step: 0.01 } }}
                required
                fullWidth
                error={amount !== "" && Number(amount) <= 0}
                helperText={
                  amount !== "" && Number(amount) <= 0
                    ? "Enter a positive amount."
                    : "Your offer is private to the seller."
                }
              />
              <Button
                type="submit"
                variant="contained"
                disabled={
                  mutationStatus === "loading" || !amount || Number(amount) <= 0
                }
                sx={{ minWidth: 150, height: 56 }}
              >
                {mutationStatus === "loading" ? "Sending..." : "Make offer"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
      {listing.status === "sold" && (
        <Alert severity="info">
          Listing sold. This watch is no longer accepting offers.
        </Alert>
      )}
      {listError && <Alert severity="error">{listError}</Alert>}
      {mutationError && <Alert severity="error">{mutationError}</Alert>}
      {listStatus === "loading" ? (
        <Typography color="text.secondary">Loading offers...</Typography>
      ) : visibleOffers.length === 0 ? (
        <Typography color="text.secondary">
          No offers yet. Offers will appear here as buyers express interest.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {visibleOffers.map((offer) => (
            <Card key={offer.id} variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  sx={{ justifyContent: "space-between", gap: 1 }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {isSeller
                        ? "Buyer offer"
                        : offer.status === "countered"
                          ? "Seller countered your offer"
                          : "Your offer"}
                    </Typography>
                    <PriceDisplay amount={offer.amount} currency={offer.currency} variant="h6" sx={{ color: "primary.main" }} />
                  </Box>
                  <StatusChip status={offer.status} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {new Date(offer.createdAt).toLocaleString()}{" "}
                  {offer.parentOfferId ? " · Response to an earlier offer" : ""}
                </Typography>
                {offer.status === "countered" && !isSeller && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ mt: 2 }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => act(offer, "accepted")}
                      disabled={mutationStatus === "loading"}
                    >
                      Accept counter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCounterTarget(offer);
                        setCounterAmount("");
                      }}
                    >
                      Make revised offer
                    </Button>
                    <Button
                      onClick={() => act(offer, "withdrawn")}
                      disabled={mutationStatus === "loading"}
                    >
                      Withdraw
                    </Button>
                  </Stack>
                )}
                {!isSeller && offer.status === "pending" && (
                  <Button
                    sx={{ mt: 1 }}
                    onClick={() => act(offer, "withdrawn")}
                    disabled={mutationStatus === "loading"}
                  >
                    Withdraw offer
                  </Button>
                )}
                {isSeller &&
                  (offer.status === "pending" ||
                    offer.status === "countered") && (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ mt: 2 }}
                    >
                      <Button
                        variant="contained"
                        onClick={() => setAcceptTarget(offer)}
                        disabled={mutationStatus === "loading"}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => act(offer, "rejected")}
                        disabled={mutationStatus === "loading"}
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setCounterTarget(offer);
                          setCounterAmount("");
                        }}
                        disabled={mutationStatus === "loading"}
                      >
                        Counter
                      </Button>
                    </Stack>
                  )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <Dialog
        open={Boolean(acceptTarget)}
        onClose={() => setAcceptTarget(null)}
        aria-labelledby="accept-offer-title"
      >
        <DialogTitle id="accept-offer-title">Accept this offer?</DialogTitle>
        <DialogContent>
          <Typography>
            Accepting{" "}
            {acceptTarget &&
              new Intl.NumberFormat("en-IN", { style: "currency", currency: acceptTarget.currency, maximumFractionDigits: 0 }).format(acceptTarget.amount)}{" "}
            marks the watch as sold and closes competing offers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => acceptTarget && act(acceptTarget, "accepted")}
          >
            Accept offer
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(counterTarget)}
        onClose={() => setCounterTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={submitCounter}>
          <DialogTitle>Send a counter-offer</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={`Counter amount (${listing.currency})`}
              type="number"
              value={counterAmount}
              onChange={(event) => setCounterAmount(event.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 0.01 } }}
              required
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCounterTarget(null)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                mutationStatus === "loading" ||
                !counterAmount ||
                Number(counterAmount) <= 0
              }
            >
              Send counter
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
