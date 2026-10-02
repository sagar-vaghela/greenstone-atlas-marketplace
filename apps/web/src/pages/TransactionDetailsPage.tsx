import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { loadStripe } from "@stripe/stripe-js";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import {
  cancelTransactionAction,
  completeTransactionAction,
  createPaymentIntentAction,
  deliverTransactionAction,
  disputeTransactionAction,
  fetchTransaction,
  payTransactionAction,
  shipTransactionAction,
  selectTransactionDetail,
  selectTransactionsError,
  selectTransactionsMutationStatus,
  selectTransactionsListStatus,
} from "../features/transactions/transactionsSlice";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const statusLabels: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

const paymentLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const fulfilmentLabels: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function TransactionDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const transaction = useAppSelector(selectTransactionDetail);
  const listStatus = useAppSelector(selectTransactionsListStatus);
  const error = useAppSelector(selectTransactionsError);
  const mutationStatus = useAppSelector(selectTransactionsMutationStatus);
  const paymentAttemptKey = useRef<string | null>(null);
  const compactTimeline = useMediaQuery("(max-width:600px)");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [awaitingReconciliation, setAwaitingReconciliation] = useState(false);

  useEffect(() => {
    if (id) {
      void dispatch(fetchTransaction(id));
    }
  }, [dispatch, id]);

  if (!id) {
    return <Alert severity="error">Transaction id is missing.</Alert>;
  }

  if (!transaction && listStatus === "loading") {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress aria-label="Loading transaction" />
      </Box>
    );
  }

  if (!transaction) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error ?? "Transaction not found."}</Alert>
        <Button
          component={RouterLink}
          to="/transactions"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: "flex-start", borderColor: "divider" }}
        >
          Back to transactions
        </Button>
      </Stack>
    );
  }

  const isBuyer = currentUser?.id === transaction.buyerId;
  const isSeller = currentUser?.id === transaction.sellerId;
  const canPay = Boolean(
    isBuyer &&
    transaction.status === "pending_payment" &&
    ["pending", "failed"].includes(transaction.paymentStatus),
  );
  const canShip = Boolean(
    isSeller &&
    transaction.status === "paid" &&
    transaction.paymentStatus === "paid" &&
    transaction.fulfilmentStatus === "pending",
  );
  const canDeliver = Boolean(
    isBuyer &&
    transaction.status === "paid" &&
    transaction.paymentStatus === "paid" &&
    transaction.fulfilmentStatus === "shipped",
  );
  const canComplete = Boolean(
    isBuyer &&
    transaction.status === "paid" &&
    transaction.paymentStatus === "paid" &&
    transaction.fulfilmentStatus === "delivered",
  );
  const canCancel = Boolean(
    (isBuyer || isSeller) && transaction.status === "pending_payment",
  );
  const canDispute = Boolean(
    (isBuyer || isSeller) &&
    transaction.status === "paid" &&
    transaction.paymentStatus === "paid",
  );

  const timeline = [
    "Offer accepted",
    "Payment pending",
    "Payment completed",
    "Fulfilment pending",
    "Shipped",
    "Delivered",
    "Completed",
  ];
  const timelineStep =
    transaction.status === "completed"
      ? 6
      : transaction.status === "paid"
        ? transaction.fulfilmentStatus === "delivered"
          ? 5
          : transaction.fulfilmentStatus === "shipped"
            ? 4
            : 3
        : 1;
  const submitPayment = async () => {
    const idempotencyKey = crypto.randomUUID();
    paymentAttemptKey.current = idempotencyKey;
    try {
      const intent = await dispatch(
        createPaymentIntentAction({ id: transaction.id, idempotencyKey }),
      ).unwrap();
      if (
        intent.provider === "stripe" &&
        intent.clientSecret &&
        stripePromise
      ) {
        setStripeClientSecret(intent.clientSecret);
        setStripeDialogOpen(true);
        return;
      }
      void dispatch(
        payTransactionAction({ id: transaction.id, idempotencyKey }),
      );
    } catch {
      // Redux owns the user-visible API error state.
    }
  };

  return (
    <Stack spacing={3}>
      <Button
        component={RouterLink}
        to="/transactions"
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        sx={{
          alignSelf: "flex-start",
          borderColor: "divider",
          color: "text.secondary",
          "&:hover": {
            borderColor: "primary.main",
            color: "primary.main",
            bgcolor: "action.hover",
          },
        }}
      >
        Back to transactions
      </Button>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Transaction
              </Typography>
              <Typography variant="h3">{transaction.id}</Typography>
            </Box>
            <Chip
              label={statusLabels[transaction.status] ?? transaction.status}
              color="primary"
            />
          </Stack>
          <Typography color="text.secondary">
            Listing {transaction.listingId}
          </Typography>
          <Typography variant="h5">
            Accepted offer: {transaction.amount.toLocaleString()}{" "}
            {transaction.currency}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.5, sm: 3 }}
          >
            <Typography variant="body2">
              Buyer: {transaction.buyerId}
            </Typography>
            <Typography variant="body2">
              Seller: {transaction.sellerId}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Created {new Date(transaction.createdAt).toLocaleString()} · Updated{" "}
            {new Date(transaction.updatedAt).toLocaleString()}
          </Typography>
        </Stack>
      </Paper>

      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2 }}>
          <Stepper
            activeStep={timelineStep}
            orientation={compactTimeline ? "vertical" : "horizontal"}
            alternativeLabel={!compactTimeline}
          >
            {timeline.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Card>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Parties</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography>Buyer: {transaction.buyerId}</Typography>
              <Typography>Seller: {transaction.sellerId}</Typography>
            </Stack>
          </Box>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Payment</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Chip
                label={
                  paymentLabels[transaction.paymentStatus] ??
                  transaction.paymentStatus
                }
                color={
                  transaction.paymentStatus === "failed"
                    ? "error"
                    : transaction.paymentStatus === "paid"
                      ? "success"
                      : "default"
                }
              />
              <Typography>
                Amount: {transaction.amount.toLocaleString()}{" "}
                {transaction.currency}
              </Typography>
              {transaction.paidAt && (
                <Typography variant="body2">
                  Paid {new Date(transaction.paidAt).toLocaleString()}
                </Typography>
              )}
              {transaction.paymentFailedAt && (
                <Typography variant="body2" color="error">
                  Last failed{" "}
                  {new Date(transaction.paymentFailedAt).toLocaleString()}
                </Typography>
              )}
            </Stack>
          </Box>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Fulfilment</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Chip
                label={
                  fulfilmentLabels[transaction.fulfilmentStatus] ??
                  transaction.fulfilmentStatus
                }
              />
              <Typography>
                Updated: {new Date(transaction.updatedAt).toLocaleString()}
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Stack>

      {transaction.status === "cancelled" && (
        <Alert severity="info">
          This transaction was cancelled. A production refund flow would be
          handled by the payment provider.
        </Alert>
      )}
      {transaction.status === "disputed" && (
        <Alert severity="warning">
          This transaction is disputed. A production dispute workflow would add
          evidence review and resolution.
        </Alert>
      )}
      {isSeller &&
        transaction.paymentStatus === "paid" &&
        transaction.fulfilmentStatus === "pending" && (
          <Alert severity="success">
            Payment received. You can now proceed to fulfilment.
          </Alert>
        )}
      {isBuyer && transaction.paymentStatus === "failed" && (
        <Alert severity="error">
          Payment failed. Review your card details and retry. No duplicate
          charge was created.
        </Alert>
      )}
      {awaitingReconciliation && transaction.paymentStatus !== "paid" && (
        <Alert severity="info">
          Payment received. Confirming transaction status...
        </Alert>
      )}

      {(canPay ||
        canShip ||
        canDeliver ||
        canComplete ||
        canCancel ||
        canDispute) && (
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Actions</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ mt: 2, flexWrap: "wrap" }}
            >
              {canPay && (
                <Button
                  variant="contained"
                  disabled={mutationStatus === "loading"}
                  onClick={submitPayment}
                >
                  {mutationStatus === "loading"
                    ? "Processing payment..."
                    : transaction.paymentStatus === "failed"
                      ? "Retry payment"
                      : "Pay now"}
                </Button>
              )}
              {canShip && (
                <Button
                  variant="contained"
                  onClick={() =>
                    void dispatch(shipTransactionAction(transaction.id))
                  }
                >
                  Mark as shipped
                </Button>
              )}
              {canDeliver && (
                <Button
                  variant="contained"
                  onClick={() =>
                    void dispatch(deliverTransactionAction(transaction.id))
                  }
                >
                  Confirm delivery
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="contained"
                  onClick={() =>
                    void dispatch(completeTransactionAction(transaction.id))
                  }
                >
                  Complete transaction
                </Button>
              )}
              {canCancel && (
                <Button
                  color="warning"
                  variant="outlined"
                  onClick={() =>
                    void dispatch(cancelTransactionAction(transaction.id))
                  }
                >
                  Cancel transaction
                </Button>
              )}
              {canDispute && (
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() =>
                    void dispatch(disputeTransactionAction(transaction.id))
                  }
                >
                  Open dispute
                </Button>
              )}
            </Stack>
          </Box>
        </Card>
      )}

      <Divider />
      <Typography
        variant="body2"
        color="text.secondary"
        role="status"
        aria-live="polite"
      >
        {transaction.status === "pending_payment" &&
          "Waiting for buyer payment."}
        {transaction.status === "paid" &&
          transaction.fulfilmentStatus === "pending" &&
          "Payment received. Waiting for seller to ship."}
        {transaction.status === "paid" &&
          transaction.fulfilmentStatus === "shipped" &&
          "Your watch is on the way."}
        {transaction.status === "paid" &&
          transaction.fulfilmentStatus === "delivered" &&
          "Delivery confirmed. Please complete the transaction."}
        {transaction.status === "completed" && "Transaction completed."}
        {transaction.status === "cancelled" &&
          "This transaction was cancelled."}
        {transaction.status === "disputed" && "A dispute has been opened."}
      </Typography>
      {stripeClientSecret && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: stripeClientSecret }}
        >
          <StripePaymentDialog
            open={stripeDialogOpen}
            clientSecret={stripeClientSecret}
            amount={transaction.amount}
            currency={transaction.currency}
            fullScreen={compactTimeline}
            onClose={() => setStripeDialogOpen(false)}
            onConfirmed={() => {
              setStripeDialogOpen(false);
              setAwaitingReconciliation(true);
              void dispatch(fetchTransaction(transaction.id));
            }}
          />
        </Elements>
      )}
    </Stack>
  );
}

function StripePaymentDialog({
  open,
  clientSecret,
  amount,
  currency,
  fullScreen,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  clientSecret: string;
  amount: number;
  currency: string;
  fullScreen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setProcessing(true);
    setError(null);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    if (result.error) {
      setError(result.error.message ?? "Payment could not be completed.");
      setProcessing(false);
      return;
    }
    onConfirmed();
    setProcessing(false);
  };

  return (
    <Dialog
      open={open}
      onClose={processing ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Secure test payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Pay {amount.toLocaleString()} {currency}
          </Typography>
          <Box
            sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}
          >
            <CardElement options={{ hidePostalCode: true }} />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Atlas will confirm the transaction after the verified payment
            webhook arrives.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void confirm()}
          disabled={processing || !stripe}
        >
          {processing ? "Processing..." : "Confirm payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
