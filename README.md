# Atlas Marketplace

Atlas Marketplace is a marketplace concept for authenticated luxury and collectible watches, connecting buyers and sellers through discovery, valuation, offers, negotiation and transaction workflows.

## Project status

The current concept is a pre-owned luxury-watch marketplace. The demo API includes Rolex and Omega watch listings and an offer negotiation workflow.

## High-level architecture

- `apps/web` — React and Vite frontend
- `apps/api` — Fastify and TypeScript backend
- `packages/types` — shared TypeScript domain types
- `packages/validation` — shared Zod validation schemas
- `packages/config` — shared non-secret configuration and constants

## Technology direction

The project uses npm workspaces, TypeScript with strict checking, React with Vite, and Node.js with Fastify. Additional application and domain dependencies will be introduced only as later features require them.

## Local setup

Install dependencies from the repository root:

```bash
npm install
```

The API uses MongoDB when `MONGODB_URI` is configured. Copy `.env.example` to
`.env` for local development and start MongoDB locally before starting the API.
Without `MONGODB_URI`, the API uses its in-memory repository for lightweight
local development and tests.

## Authentication and ownership

Authentication uses a small first-party, server-side session boundary. Passwords
are hashed with Node `scrypt`; login and registration issue an HTTP-only,
SameSite cookie, and `/auth/me` restores the current public user on refresh.
Sessions are stored in MongoDB when MongoDB is configured, or in memory for
local development. The public user model contains `id`, `email`, `displayName`,
`role`, and timestamps; password hashes never leave the API.

Listing creation derives `sellerId` from the authenticated session. Listing
editing and status changes require that the session user owns the listing.
Offers derive `buyerId` from the session and `sellerId` from the listing;
withdrawal is buyer-only, while acceptance, rejection, and counters are
seller-only except that a buyer may accept a seller counter. Public listing
discovery remains available without signing in.

The frontend role is presentation state; authorization is enforced server-side using the authenticated user identity and resource ownership.

## Seller profiles and trust

Seller-specific marketplace information lives in `SellerProfile`, referenced by
`userId`; `User` remains responsible for authentication identity and credentials.
The public seller API exposes only a seller id, display name, profile fields and
derived listing statistics. It never exposes email, password hashes, sessions or
private offers and negotiation history.

Trust signals are factual marketplace data, not an overall seller score. The
profile shows member-since date, active listings, sold listings and an optional
profile response rate. Active and sold counts are derived from listing status,
so the current `sold` lifecycle is labelled as sold listings rather than
completed purchases. Verification is the explicit profile state
`unverified`, `pending` or `verified`; demo `verified` values are deterministic
marketplace seed data and do not represent KYC or government-ID verification.

Public seller listings include active listings only. Profile edits are limited
to display name, bio and broad location, and are authorized from the session
identity rather than a client-supplied user id. Verification, member-since,
response-rate and listing statistics remain server-controlled.

The seller endpoints are `GET /sellers/:sellerId`, `GET
/sellers/:sellerId/listings`, `GET /me/seller-profile` and `PATCH
/me/seller-profile`. The last two require the HTTP-only session; public profile
and listing responses do not include offer or negotiation data.

Real identity verification should later integrate with a dedicated KYC provider.
Reviews and ratings are also future extensions, not part of this trust model.
Response rate is a small seeded marketplace profile value for the demo because
the current offer model does not provide the timestamps and response lifecycle
needed for honest analytics.

Development-only demo accounts are seeded by the in-memory repository:
`seller@example.com` / `seller123`, `buyer@example.com` / `buyer123`, and
`buyer2@example.com` / `buyer123`. A second fictional seller is available as
`seller2@example.com` / `seller123`. These are not production credentials.
Legacy listings and offers retain the deterministic `demo-seller` and
`demo-buyer` identities rather than being assigned to the first requester.

Production extensions should include rate limiting, CSRF protection appropriate
to deployment, managed session secrets and rotation, password reset, email
verification, MFA, audit logging, account risk controls, failure monitoring,
and secure production cookie configuration. An external identity provider can
replace the first-party credential/session implementation without changing the
ownership boundary.

## Offers and negotiation

- Offers use `pending`, `countered`, `accepted`, `rejected`, `withdrawn`, and `expired` states. A counter is a new immutable offer linked with `parentOfferId`; historical amounts are never overwritten.
- REST endpoints are `GET /listings/:listingId/offers`, `GET /offers/:id`, `POST /listings/:listingId/offers`, `PATCH /offers/:id/status`, and `POST /offers/:id/counter`.
- Offer state is kept in the Redux Toolkit `offers` slice, so future real-time events can dispatch the same reducers used by REST mutations.
- Acceptance marks the listing sold and rejects competing actionable offers. The current repository flow is guarded with conditional updates; production MongoDB should use a transaction or stronger atomic cross-document operation for race-free settlement.
- Amounts currently use numbers to match the existing listing model. Production money should move to integer minor units or a decimal-safe representation.

## Transaction lifecycle

Transaction state is intentionally separated from payment and fulfilment states:

```text
TransactionStatus:
- pending_payment
- paid
- completed
- cancelled
- disputed

PaymentStatus:
- pending
- paid
- failed
- refunded

FulfilmentStatus:
- pending
- shipped
- delivered
```

The normal lifecycle still follows the existing offer-to-transaction flow:

```text
Offer accepted
  -> status = pending_payment
  -> paymentStatus = pending
  -> fulfilmentStatus = pending

Buyer pays
  -> status = paid
  -> paymentStatus = paid
  -> fulfilmentStatus = pending

Seller ships
  -> status = paid
  -> paymentStatus = paid
  -> fulfilmentStatus = shipped

Buyer confirms delivery
  -> status = paid
  -> paymentStatus = paid
  -> fulfilmentStatus = delivered

Complete
  -> status = completed
  -> paymentStatus = paid
  -> fulfilmentStatus = delivered
```

Cross-state rules are enforced server-side:

- Shipping requires `transaction.status === paid`, `paymentStatus === paid`, and `fulfilmentStatus === pending`.
- Delivery requires `transaction.status === paid`, `paymentStatus === paid`, and `fulfilmentStatus === shipped`.
- Completion requires `transaction.status === paid`, `paymentStatus === paid`, and `fulfilmentStatus === delivered`.
- Shipping and delivery are represented in `fulfilmentStatus`; they do not change `TransactionStatus`.
- The API preserves the existing action endpoints (`POST /transactions/:id/payment`, `/ship`, `/deliver`, `/complete`, `/cancel`, `/dispute`) and rejects invalid lifecycle transitions with a `409` conflict.

## Real-time offer updates

Offer commands remain REST requests. After a successful repository mutation, the
API publishes a recipient-scoped `MarketplaceEvent` to an in-memory
`MarketplaceEventBus`; authenticated clients receive those events through
`GET /events` using Server-Sent Events, and Redux applies version-aware updates.

```text
REST command -> Repository -> Event Bus -> Authenticated SSE -> Redux -> React
```

SSE fits this interview implementation because traffic is primarily
server-to-client, commands already use REST, and the browser provides a native
reconnecting client without a WebSocket dependency. The HTTP-only session cookie
authenticates the stream. The bus maps user ids to listeners, so sellers receive
their listing offers and buyers receive only their own offer and listing events;
unrelated users are not subscribed to those events. Event payloads contain no
passwords, sessions, emails, or competing buyers' private negotiations.

Each event has a unique id and server timestamp. Offers and listings have a
server-controlled version; Redux ignores an event older than the state it already
holds. REST remains authoritative, and the client refetches offers when the SSE
connection is established or restored. SSE ordering is per connection only, so a
production replay-capable transport should use event ids and a shared log.

The current in-memory bus is reliable only for a single API instance. A scaled
deployment would publish domain events to a shared broker and deliver them from a
real-time gateway:

```text
API instances -> EventBridge / SNS / SQS / Redis -> Real-time gateway -> WebSocket or SSE
```

Possible managed choices include AWS EventBridge, SNS/SQS, API Gateway WebSocket,
AWS AppSync, or another service selected for the required fan-out and replay
semantics. MongoDB remains persistence, not the live event transport. MongoDB
change streams do not provide recipient authorization by themselves, and the
explicit domain event model keeps delivery separate from storage. Acceptance is
still server-authoritative and must use a transaction or equivalent atomic
cross-document operation at production scale; real-time events are updates, not
the source of truth.

Start the frontend:

```bash
npm run dev
```

Start the API in a separate terminal:

```bash
npm run dev:api
```

The API health check is available at `http://localhost:3000/health`.

## Notifications and activity center

Commit 20 persists actionable user activity separately from transport events:

```text
Domain action -> MarketplaceEvent -> NotificationService -> repository
             -> recipient-scoped SSE -> Redux -> badge / Snackbar / activity center
```

`Notification` records are lightweight and contain a server-derived recipient,
one of the offer, message, payment, shipment, delivery, completion, or listing
types, a resource reference, read state, and creation time. Offer recipients
are derived from buyer/seller fields, message recipients from the conversation,
and transaction recipients from the transaction lifecycle. No client-supplied
user id or notification type is trusted.

The API exposes authenticated `GET /notifications?limit=30&before=...`,
`GET /notifications/unread-count`, `POST /notifications/:id/read`, and
`POST /notifications/read-all`. Results are ordered newest first with a stable
id tie-breaker. MongoDB stores notifications separately from domain events and
uses unique `id` and `userId + sourceEventId` indexes, plus user/time and
unread query indexes, to prevent duplicate projections and keep inbox queries
bounded. The in-memory repository follows the same contract for local runs.

`notification.created` is an additional recipient-scoped SSE event; existing
offer, message, transaction, and listing events continue to synchronize their
feature slices. Redux hydrates through REST, prepends and deduplicates SSE
notifications, reconciles unread counts after SSE reconnect, and marks read
state only when a notification is opened or the explicit mark-all action is
used. The activity center supports cursor pagination and navigates through the
existing listing, conversation, offer, and transaction routes without embedding
large domain objects.

Email, push, SMS, preferences, digests, moderation, and a distributed event
broker are future extensions and are intentionally outside Commit 20.

## Monorepo structure

```text
apps/
  web/
  api/
packages/
  types/
  validation/
  config/
docs/
```

## Buyer and seller messaging

Commit 19 adds private messaging around a listing. A conversation always has a
listing, buyer and seller; offer and transaction ids remain optional so a buyer
can ask a question before negotiating or purchasing.

```text
Conversation -> Messages -> REST persistence -> recipient-scoped SSE -> Redux synchronization
```

The API derives buyer, seller and sender identity from the authenticated session.
Only the conversation participants can read, send, or mark messages read; an
unrelated authenticated user receives `403`, and unauthenticated requests
receive `401`. Public participant data is limited to id and display name.
Messages are trimmed plain text, limited to 2,000 characters, and never rendered
as HTML.

Messaging endpoints are `POST /conversations`, `GET /conversations`, `GET
/conversations/:id`, `GET /conversations/:id/messages?limit=50&before=cursor`,
`POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
Messages are returned chronologically. The first page is capped at 50 items;
older pages use the oldest returned message timestamp as a deterministic cursor.

MongoDB stores `conversations` and `messages`. Conversations have unique id,
buyer, seller, listing, composite buyer/seller/listing, and last-message-time
indexes. Messages have unique id, conversation/created-time, and sender indexes.
Read state is stored as participant-specific last-read timestamps and unread
counts are calculated server-side.

New `message.created` and `conversation.read` events use the existing SSE event
bus and are published only to the other participant. Redux deduplicates message
ids, preserves chronological order, updates previews and unread counts, and
continues to use REST as the source of truth after reconnects. SSE was chosen
because this workflow already uses REST commands and primarily needs
server-to-client notifications; a shared broker plus WebSocket or replayable
SSE gateway should be considered if scale requires it.

Attachments, typing indicators, message editing/deletion, moderation, abuse
reporting, notification preferences, email/push notifications, and a brokered
WebSocket architecture are future extensions and are intentionally outside
Commit 19.
```
