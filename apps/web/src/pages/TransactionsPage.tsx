import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectCurrentUser } from "../features/auth/authSlice";
import {
  fetchMyTransactions,
  selectTransactions,
  selectTransactionsListStatus,
  selectTransactionsError,
} from "../features/transactions/transactionsSlice";
import { EmptyState } from "../components/common/EmptyState";
import { PriceDisplay } from "../components/common/PriceDisplay";
import { StatusChip } from "../components/common/StatusChip";
import { PageHeader } from "../components/common/PageHeader";

export function TransactionsPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const listStatus = useAppSelector(selectTransactionsListStatus);
  const error = useAppSelector(selectTransactionsError);
  const items = useAppSelector(selectTransactions);

  useEffect(() => {
    if (currentUser) {
      void dispatch(fetchMyTransactions());
    }
  }, [currentUser, dispatch]);

  if (!currentUser) {
    return (
      <Alert severity="info">
        Please sign in to view your transactions.
      </Alert>
    );
  }

  if (listStatus === "loading" && items.length === 0) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
        <CircularProgress aria-label="Loading transactions" />
      </Box>
    );
  }

  const buying = items.filter((transaction) => transaction.buyerId === currentUser.id);
  const selling = items.filter((transaction) => transaction.sellerId === currentUser.id);

  return (
    <Stack spacing={3}>
      <PageHeader title="Transactions" description="Keep the handover clear from accepted offer to completed delivery." />
      {error && <Alert severity="error">{error}</Alert>}
      <Stack spacing={2}>
          <Typography variant="h5">Buying</Typography>
        {buying.length === 0 ? (
          <EmptyState title="No purchases yet" description="Accepted offers will appear here." />
        ) : (
          buying.map((transaction) => (
            <Card key={transaction.id} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Transaction {transaction.id}
                    </Typography>
                    <Typography variant="h6">Listing {transaction.listingId}</Typography>
                  </Box>
                  <StatusChip status={transaction.status} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <PriceDisplay amount={transaction.amount} currency={transaction.currency} variant="body2" />
                  <Typography>Payment: {transaction.paymentStatus}</Typography>
                  <Typography>Fulfilment: {transaction.fulfilmentStatus}</Typography>
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Button component={RouterLink} to={`/transactions/${transaction.id}`} variant="outlined">
                    View transaction
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
      <Stack spacing={2}>
          <Typography variant="h5">Selling</Typography>
        {selling.length === 0 ? (
          <EmptyState title="No sales yet" description="Your completed listings will appear here." />
        ) : (
          selling.map((transaction) => (
            <Card key={transaction.id} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Transaction {transaction.id}
                    </Typography>
                    <Typography variant="h6">Listing {transaction.listingId}</Typography>
                  </Box>
                  <StatusChip status={transaction.status} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <PriceDisplay amount={transaction.amount} currency={transaction.currency} variant="body2" />
                  <Typography>Payment: {transaction.paymentStatus}</Typography>
                  <Typography>Fulfilment: {transaction.fulfilmentStatus}</Typography>
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Button component={RouterLink} to={`/transactions/${transaction.id}`} variant="outlined">
                    View transaction
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
}
