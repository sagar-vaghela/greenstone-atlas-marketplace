import { useEffect } from "react";
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

const stepStatusMap: Record<string, number> = {
  pending_payment: 0,
  paid: 1,
  completed: 2,
  cancelled: 0,
  disputed: 1,
};

export function TransactionDetailsPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const transaction = useAppSelector(selectTransactionDetail);
  const listStatus = useAppSelector(selectTransactionsListStatus);
  const error = useAppSelector(selectTransactionsError);

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
      transaction.paymentStatus === "pending",
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

  const stepLabels = [
    "Payment",
    "Fulfilment",
    "Completed",
  ];

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
          <Typography variant="h5">{transaction.amount.toLocaleString()} {transaction.currency}</Typography>
        </Stack>
      </Paper>

      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2 }}>
          <Stepper activeStep={stepStatusMap[transaction.status] ?? 0} alternativeLabel>
            {stepLabels.map((label) => (
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
              <Chip label={paymentLabels[transaction.paymentStatus] ?? transaction.paymentStatus} />
              <Typography>Amount: {transaction.amount.toLocaleString()} {transaction.currency}</Typography>
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

      {(canPay || canShip || canDeliver || canComplete || canCancel || canDispute) && (
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Actions</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
              {canPay && (
                <Button variant="contained" onClick={() => void dispatch(payTransactionAction(transaction.id))}>
                  Complete payment
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
