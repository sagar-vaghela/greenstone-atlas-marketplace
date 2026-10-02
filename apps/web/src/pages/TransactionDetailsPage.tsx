import { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  TextField,
  Stepper,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { DisputeReason } from "@atlas/types";
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
  clearTransactionError,
  completeTransactionAction,
  createPaymentIntentAction,
  deliverTransactionAction,
  disputeTransactionAction,
  fetchTransaction,
  shipTransactionAction,
  selectTransactionById,
  selectTransactionDetailStatus,
  selectTransactionsError,
  selectTransactionsMutationStatus,
} from "../features/transactions/transactionsSlice";

const supportEmail = "support@example.com";
const disputeReasonLabels: Record<DisputeReason, string> = {
  item_not_received: "Item not received",
  item_not_as_described: "Item not as described",
  suspected_counterfeit: "Authenticity concern",
  payment_or_refund: "Payment or refund issue",
  other: "Other",
};

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
  const transaction = useAppSelector((state) =>
    selectTransactionById(state, id ?? ""),
  );
  const detailStatus = useAppSelector((state) =>
    selectTransactionDetailStatus(state, id ?? ""),
  );
  const error = useAppSelector(selectTransactionsError);
  const mutationStatus = useAppSelector(selectTransactionsMutationStatus);
  const compactTimeline = useMediaQuery("(max-width:600px)");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false);
  const [awaitingReconciliation, setAwaitingReconciliation] = useState(false);
  const [paymentSetupError, setPaymentSetupError] = useState<string | null>(
    null,
  );
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason | "">("");
  const [disputeDescription, setDisputeDescription] = useState("");

  useEffect(() => {
    if (id) {
      void dispatch(fetchTransaction(id));
    }
  }, [dispatch, id]);

  if (!id) {
    return <Alert severity="error">Transaction id is missing.</Alert>;
  }

  if (!transaction && detailStatus !== "failed") {
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
    setPaymentSetupError(null);
    if (!stripePromise) {
      setPaymentSetupError(
        "Card checkout is not configured on this site. No payment was made; please contact support.",
      );
      return;
    }
    const idempotencyKey = crypto.randomUUID();
    try {
      const intent = await dispatch(
        createPaymentIntentAction({ id: transaction.id, idempotencyKey }),
      ).unwrap();
      if (
        intent.provider === "stripe" &&
        intent.clientSecret
      ) {
        setStripeClientSecret(intent.clientSecret);
        setStripeDialogOpen(true);
        return;
      }
      setPaymentSetupError(
        "The card payment provider did not return a Stripe checkout. This transaction remains unpaid.",
      );
      if (intent.status === "paid") {
        setAwaitingReconciliation(true);
        void dispatch(fetchTransaction(transaction.id));
      }
    } catch {
      // Redux owns the user-visible API error state.
    }
  };
  const submitDispute = async () => {
    if (!disputeReason) return;
    try {
      await dispatch(
        disputeTransactionAction({
          id: transaction.id,
          reason: disputeReason,
          description: disputeDescription.trim(),
        }),
      ).unwrap();
    } catch {
      // The API error is shown in the dialog.
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
          <Stack spacing={1}>
            <Typography>
              Case {transaction.dispute?.caseReference ?? "opened"} has been
              submitted for review.
            </Typography>
            {transaction.dispute && (
              <>
                <Typography variant="body2">
                  Reason: {disputeReasonLabels[transaction.dispute.reason]}
                </Typography>
                <Typography variant="body2">
                  {transaction.dispute.description}
                </Typography>
                <Typography variant="body2">
                  Submitted{" "}
                  {new Date(transaction.dispute.openedAt).toLocaleString()}
                </Typography>
              </>
            )}
            <Typography variant="body2">
              Need to add more information?{" "}
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Dispute ${transaction.dispute?.caseReference ?? transaction.id}`)}&body=${encodeURIComponent(`Please include case ${transaction.dispute?.caseReference ?? transaction.id} in your reply.`)}`}
              >
                Contact the support team
              </a>
              .
            </Typography>
          </Stack>
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
      {mutationStatus === "failed" && error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {paymentSetupError && (
        <Alert severity="error" role="alert">
          {paymentSetupError}
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
                  disabled={mutationStatus === "loading"}
                  onClick={() =>
                    void dispatch(shipTransactionAction(transaction.id))
                  }
                >
                  {mutationStatus === "loading" ? "Updating..." : "Mark as shipped"}
                </Button>
              )}
              {canDeliver && (
                <Button
                  variant="contained"
                  disabled={mutationStatus === "loading"}
                  onClick={() =>
                    void dispatch(deliverTransactionAction(transaction.id))
                  }
                >
                  {mutationStatus === "loading" ? "Updating..." : "Confirm delivery"}
                </Button>
              )}
              {canComplete && (
                <Button
                  variant="contained"
                  disabled={mutationStatus === "loading"}
                  onClick={() =>
                    void dispatch(completeTransactionAction(transaction.id))
                  }
                >
                  {mutationStatus === "loading" ? "Updating..." : "Complete transaction"}
                </Button>
              )}
              {canCancel && (
                <Button
                  color="warning"
                  variant="outlined"
                  disabled={mutationStatus === "loading"}
                  onClick={() =>
                    void dispatch(cancelTransactionAction(transaction.id))
                  }
                >
                  {mutationStatus === "loading" ? "Updating..." : "Cancel transaction"}
                </Button>
              )}
              {canDispute && (
                <Button
                  color="error"
                  variant="outlined"
                  disabled={mutationStatus === "loading"}
                  onClick={() => {
                    dispatch(clearTransactionError());
                    setDisputeDialogOpen(true);
                  }}
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
      <Dialog
        open={disputeDialogOpen}
        onClose={() => setDisputeDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {transaction.dispute ? "Dispute submitted" : "Open a dispute"}
        </DialogTitle>
        <DialogContent>
          {transaction.dispute ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success">
                Case {transaction.dispute.caseReference} is saved and shared
                with both transaction participants.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Your case is saved to this transaction. Both participants can
                view it; email support if you need to continue the conversation.
              </Typography>
              <Button
                component="a"
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(`Dispute ${transaction.dispute.caseReference}`)}&body=${encodeURIComponent(`Hello Support Team,\n\nI need help with dispute case ${transaction.dispute.caseReference} for transaction ${transaction.id}.\n\n`)}`}
                variant="outlined"
                sx={{ alignSelf: "flex-start" }}
              >
                Email support
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="info">
                Tell us what happened. Opening a dispute pauses the transaction
                and saves your case; use the demo support contact below to
                request follow-up.
              </Alert>
              {mutationStatus === "failed" && error && (
                <Alert severity="error">{error}</Alert>
              )}
              <FormControl fullWidth required>
                <InputLabel id="dispute-reason-label">Reason</InputLabel>
                <Select
                  labelId="dispute-reason-label"
                  value={disputeReason}
                  label="Reason"
                  onChange={(event) =>
                    setDisputeReason(event.target.value as DisputeReason)
                  }
                >
                  {Object.entries(disputeReasonLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="What happened?"
                value={disputeDescription}
                onChange={(event) =>
                  setDisputeDescription(event.target.value.slice(0, 2000))
                }
                multiline
                minRows={4}
                maxRows={8}
                required
                helperText={`${disputeDescription.length}/2000 characters (minimum 20)`}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
              <Typography variant="body2" color="text.secondary">
                For direct follow-up, email the demo support contact at{" "}
                <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Submitting
                this form saves a case in the transaction.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {transaction.dispute ? (
            <Button onClick={() => setDisputeDialogOpen(false)}>Done</Button>
          ) : (
            <>
              <Button
                onClick={() => setDisputeDialogOpen(false)}
                disabled={mutationStatus === "loading"}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => void submitDispute()}
                disabled={
                  mutationStatus === "loading" ||
                  !disputeReason ||
                  disputeDescription.trim().length < 20
                }
                startIcon={
                  mutationStatus === "loading" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {mutationStatus === "loading" ? "Submitting..." : "Submit dispute"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
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
