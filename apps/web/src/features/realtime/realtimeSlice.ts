import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MarketplaceEvent } from "@atlas/types";
import type { EventConnectionStatus } from "../../api/marketplaceEvents";

interface RealtimeState {
  connectionStatus: EventConnectionStatus | "disconnected";
  lastEventAt: string | null;
  lastEventId: string | null;
  notification: { message: string; severity: "info" | "success" } | null;
}

const initialState: RealtimeState = {
  connectionStatus: "disconnected",
  lastEventAt: null,
  lastEventId: null,
  notification: null,
};

const realtimeSlice = createSlice({
  name: "realtime",
  initialState,
  reducers: {
    connectionStatusChanged: (state, action: PayloadAction<RealtimeState["connectionStatus"]>) => {
      state.connectionStatus = action.payload;
    },
    eventReceived: (
      state,
      action: PayloadAction<{ event: MarketplaceEvent; userId: string }>,
    ) => {
      const { event, userId } = action.payload;
      state.lastEventAt = event.timestamp;
      state.lastEventId = event.id;
      if (event.actorUserId === userId && event.type === "offer.created") return;
      const messages: Record<MarketplaceEvent["type"], string> = {
        "offer.created": "New offer received for this listing.",
        "offer.countered": "Seller sent you a counter-offer.",
        "offer.accepted": "Your offer was accepted.",
        "offer.rejected": "Your offer is no longer available.",
        "offer.withdrawn": "An offer was withdrawn.",
        "listing.status_changed": "Listing status changed.",
      };
      state.notification = {
        message: messages[event.type],
        severity: event.type === "offer.accepted" ? "success" : "info",
      };
    },
    notificationClosed: (state) => {
      state.notification = null;
    },
  },
});

export const { connectionStatusChanged, eventReceived, notificationClosed } = realtimeSlice.actions;
export const selectRealtime = (state: { realtime: RealtimeState }) => state.realtime;
export default realtimeSlice.reducer;