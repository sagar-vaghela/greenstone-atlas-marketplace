import { useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import {
  cancelTransactionAction,
  completeTransactionAction,
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
        <Button component={RouterLink} to="/transactions" variant="outlined">
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
  const canCancel = Boolean((isBuyer || isSeller) && transaction.status === "pending_payment");
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
  const timelineStep = transaction.status === "completed"
    ? 6
    : transaction.status === "paid"
      ? transaction.fulfilmentStatus === "delivered" ? 5 : transaction.fulfilmentStatus === "shipped" ? 4 : 3
      : 1;
  const submitPayment = () => {
    if (!window.confirm(`Pay ${transaction.amount.toLocaleString()} ${transaction.currency} for this accepted offer?`)) return;
    const idempotencyKey = crypto.randomUUID();
    paymentAttemptKey.current = idempotencyKey;
    void dispatch(payTransactionAction({ id: transaction.id, idempotencyKey }));
  };

  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/transactions" sx={{ alignSelf: "flex-start" }}>
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
              <Typography variant="overline" color="text.secondary">Transaction</Typography>
              <Typography variant="h3">{transaction.id}</Typography>
            </Box>
            <Chip label={statusLabels[transaction.status] ?? transaction.status} color="primary" />
          </Stack>
          <Typography color="text.secondary">Listing {transaction.listingId}</Typography>
          <Typography variant="h5">Accepted offer: {transaction.amount.toLocaleString()} {transaction.currency}</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 3 }}>
            <Typography variant="body2">Buyer: {transaction.buyerId}</Typography>
            <Typography variant="body2">Seller: {transaction.sellerId}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">Created {new Date(transaction.createdAt).toLocaleString()} · Updated {new Date(transaction.updatedAt).toLocaleString()}</Typography>
        </Stack>
      </Paper>

      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2 }}>
          <Stepper activeStep={timelineStep} orientation={compactTimeline ? "vertical" : "horizontal"} alternativeLabel={!compactTimeline}>
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
              <Chip label={paymentLabels[transaction.paymentStatus] ?? transaction.paymentStatus} color={transaction.paymentStatus === "failed" ? "error" : transaction.paymentStatus === "paid" ? "success" : "default"} />
              <Typography>Amount: {transaction.amount.toLocaleString()} {transaction.currency}</Typography>
              {transaction.paidAt && <Typography variant="body2">Paid {new Date(transaction.paidAt).toLocaleString()}</Typography>}
              {transaction.paymentFailedAt && <Typography variant="body2" color="error">Last failed {new Date(transaction.paymentFailedAt).toLocaleString()}</Typography>}
            </Stack>
          </Box>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Fulfilment</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Chip label={fulfilmentLabels[transaction.fulfilmentStatus] ?? transaction.fulfilmentStatus} />
              <Typography>Updated: {new Date(transaction.updatedAt).toLocaleString()}</Typography>
            </Stack>
          </Box>
        </Card>
      </Stack>

      {transaction.status === "cancelled" && (
        <Alert severity="info">This transaction was cancelled. A production refund flow would be handled by the payment provider.</Alert>
      )}
      {transaction.status === "disputed" && (
        <Alert severity="warning">This transaction is disputed. A production dispute workflow would add evidence review and resolution.</Alert>
      )}
      {isSeller && transaction.paymentStatus === "paid" && transaction.fulfilmentStatus === "pending" && (
        <Alert severity="success">Payment received. You can now proceed to fulfilment.</Alert>
      )}
      {isBuyer && transaction.paymentStatus === "failed" && (
        <Alert severity="error">Payment failed. Check the demo payment result and retry.</Alert>
      )}

      {(canPay || canShip || canDeliver || canComplete || canCancel || canDispute) && (
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Actions</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
              {canPay && (
                <Button variant="contained" disabled={mutationStatus === "loading"} onClick={submitPayment}>
                  {mutationStatus === "loading" ? "Processing payment..." : transaction.paymentStatus === "failed" ? "Retry payment" : "Pay now"}
                </Button>
              )}
              {canShip && (
                <Button variant="contained" onClick={() => void dispatch(shipTransactionAction(transaction.id))}>
                  Mark as shipped
                </Button>
              )}
              {canDeliver && (
                <Button variant="contained" onClick={() => void dispatch(deliverTransactionAction(transaction.id))}>
                  Confirm delivery
                </Button>
              )}
              {canComplete && (
                <Button variant="contained" onClick={() => void dispatch(completeTransactionAction(transaction.id))}>
                  Complete transaction
                </Button>
              )}
              {canCancel && (
                <Button color="warning" variant="outlined" onClick={() => void dispatch(cancelTransactionAction(transaction.id))}>
                  Cancel transaction
                </Button>
              )}
              {canDispute && (
                <Button color="error" variant="outlined" onClick={() => void dispatch(disputeTransactionAction(transaction.id))}>
                  Open dispute
                </Button>
              )}
            </Stack>
          </Box>
        </Card>
      )}

      <Divider />
      <Typography variant="body2" color="text.secondary" role="status" aria-live="polite">
        {transaction.status === "pending_payment" && "Waiting for buyer payment."}
        {transaction.status === "paid" && transaction.fulfilmentStatus === "pending" && "Payment received. Waiting for seller to ship."}
        {transaction.status === "paid" && transaction.fulfilmentStatus === "shipped" && "Your watch is on the way."}
        {transaction.status === "paid" && transaction.fulfilmentStatus === "delivered" && "Delivery confirmed. Please complete the transaction."}
        {transaction.status === "completed" && "Transaction completed."}
        {transaction.status === "cancelled" && "This transaction was cancelled."}
        {transaction.status === "disputed" && "A dispute has been opened."}
      </Typography>
    </Stack>
  );
}
