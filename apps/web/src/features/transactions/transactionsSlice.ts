import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { Transaction } from "@atlas/types";
import { ApiError } from "../../api/client";
import {
  cancelTransaction,
  completeTransaction,
  deliverTransaction,
  disputeTransaction,
  getMyTransactions,
  getTransactionById,
  createPaymentIntent,
  payTransaction,
  shipTransaction,
} from "../../api/transactions";
import type { PaymentIntentResponse } from "../../api/transactions";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface TransactionsState {
  items: Record<string, Transaction>;
  selectedId: string | null;
  listStatus: RequestStatus;
  detailStatus: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
}

const initialState: TransactionsState = {
  items: {},
  selectedId: null,
  listStatus: "idle",
  detailStatus: "idle",
  mutationStatus: "idle",
  error: null,
};

const message = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const setTransaction = (state: TransactionsState, transaction: Transaction) => {
  const current = state.items[transaction.id];
  if (!current || transaction.version >= current.version) {
    state.items[transaction.id] = transaction;
  }
  state.selectedId = state.selectedId ?? transaction.id;
};

export const fetchMyTransactions = createAsyncThunk<
  Transaction[],
  void,
  { rejectValue: string }
>("transactions/fetchMyTransactions", async (_, { rejectWithValue }) => {
  try {
    return await getMyTransactions();
  } catch (error) {
    return rejectWithValue(message(error, "Unable to load your transactions."));
  }
});

export const fetchTransaction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/fetchTransaction", async (id, { rejectWithValue }) => {
  try {
    return await getTransactionById(id);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to load this transaction."));
  }
});

export const payTransactionAction = createAsyncThunk<
  Transaction,
  { id: string; idempotencyKey: string; outcome?: "success" | "failure" },
  { rejectValue: string }
>(
  "transactions/pay",
  async ({ id, idempotencyKey, outcome }, { rejectWithValue }) => {
    try {
      return await payTransaction(id, idempotencyKey, outcome);
    } catch (error) {
      return rejectWithValue(message(error, "Unable to complete payment."));
    }
  },
);

export const createPaymentIntentAction = createAsyncThunk<
  PaymentIntentResponse,
  { id: string; idempotencyKey: string },
  { rejectValue: string }
>("transactions/createPaymentIntent", async (input, { rejectWithValue }) => {
  try {
    return await createPaymentIntent(input.id, input.idempotencyKey);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to prepare payment."));
  }
});

export const shipTransactionAction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/ship", async (id, { rejectWithValue }) => {
  try {
    return await shipTransaction(id);
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to mark the item as shipped."),
    );
  }
});

export const deliverTransactionAction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/deliver", async (id, { rejectWithValue }) => {
  try {
    return await deliverTransaction(id);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to confirm delivery."));
  }
});

export const completeTransactionAction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/complete", async (id, { rejectWithValue }) => {
  try {
    return await completeTransaction(id);
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to complete the transaction."),
    );
  }
});

export const cancelTransactionAction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/cancel", async (id, { rejectWithValue }) => {
  try {
    return await cancelTransaction(id);
  } catch (error) {
    return rejectWithValue(
      message(error, "Unable to cancel this transaction."),
    );
  }
});

export const disputeTransactionAction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: string }
>("transactions/dispute", async (id, { rejectWithValue }) => {
  try {
    return await disputeTransaction(id);
  } catch (error) {
    return rejectWithValue(message(error, "Unable to open a dispute."));
  }
});

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    transactionEventReceived: (
      state,
      action: PayloadAction<{ transaction: Transaction }>,
    ) => {
      setTransaction(state, action.payload.transaction);
    },
    clearTransactionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTransactions.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchMyTransactions.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        for (const item of action.payload) setTransaction(state, item);
      })
      .addCase(fetchMyTransactions.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.payload ?? "Unable to load transactions.";
      })
      .addCase(fetchTransaction.pending, (state) => {
        state.detailStatus = "loading";
        state.error = null;
      })
      .addCase(fetchTransaction.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        state.selectedId = action.payload.id;
        setTransaction(state, action.payload);
      })
      .addCase(fetchTransaction.rejected, (state, action) => {
        state.detailStatus = "failed";
        state.error = action.payload ?? "Unable to load this transaction.";
      })
      .addCase(payTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(payTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(payTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to complete payment.";
      })
      .addCase(createPaymentIntentAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(createPaymentIntentAction.fulfilled, (state) => {
        state.mutationStatus = "succeeded";
      })
      .addCase(createPaymentIntentAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to prepare payment.";
      })
      .addCase(shipTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(shipTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(shipTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to mark the item as shipped.";
      })
      .addCase(deliverTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(deliverTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(deliverTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to confirm delivery.";
      })
      .addCase(completeTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(completeTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(completeTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to complete this transaction.";
      })
      .addCase(cancelTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(cancelTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(cancelTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to cancel this transaction.";
      })
      .addCase(disputeTransactionAction.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(disputeTransactionAction.fulfilled, (state, action) => {
        state.mutationStatus = "succeeded";
        setTransaction(state, action.payload);
      })
      .addCase(disputeTransactionAction.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.payload ?? "Unable to open a dispute.";
      });
  },
});

export const { transactionEventReceived, clearTransactionError } =
  transactionsSlice.actions;
export const selectTransactions = createSelector(
  (state: { transactions: TransactionsState }) => state.transactions.items,
  (items) =>
    Object.values(items).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    ),
);
export const selectTransactionDetail = (state: {
  transactions: TransactionsState;
}) =>
  state.transactions.selectedId
    ? (state.transactions.items[state.transactions.selectedId] ?? null)
    : null;
export const selectTransactionsListStatus = (state: {
  transactions: TransactionsState;
}) => state.transactions.listStatus;
export const selectTransactionsError = (state: {
  transactions: TransactionsState;
}) => state.transactions.error;
export const selectTransactionsMutationStatus = (state: {
  transactions: TransactionsState;
}) => state.transactions.mutationStatus;
export default transactionsSlice.reducer;
