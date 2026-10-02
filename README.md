# Atlas Marketplace

Atlas Marketplace is a marketplace concept for authenticated luxury and collectible watches, connecting buyers and sellers through discovery, valuation, offers, negotiation and transaction workflows.

## Project status

The current concept is a pre-owned luxury-watch marketplace. The demo API includes Rolex and Omega watch listings and an offer negotiation workflow.

## High-level architecture

## Technology direction

The project uses npm workspaces, TypeScript with strict checking, React with Vite, and Node.js with Fastify. Additional application and domain dependencies will be introduced only as later features require them.

## Greenstone Equity Partners UAE POC

The Greenstone Equity Partners UAE POC is AED-only and uses UAE locale formatting.
New data is validated as AED. For an existing MongoDB database, approve an
exchange rate and run `LEGACY_INR_TO_AED_RATE=0.043 npm run
migrate:currency --workspace @atlas/api`; the command reports skipped Stripe-linked
transactions instead of changing their authoritative payment amount.

## Local setup

Install dependencies from the repository root:

```bash
npm install
```

MongoDB Atlas is the production persistence layer. In local development you may
still run the API with the in-memory repository when you intentionally opt out,
but production-like environments must fail fast when `MONGODB_URI` is missing.

Add your Atlas connection locally to `apps/api/.env` and set:

```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=atlas_marketplace
```

Do not commit secrets. Keep the actual connection string in your local environment
only. To seed the demo marketplace data after the Atlas connection string is set,
run:

```bash
npm run seed --workspace @atlas/api
```

For an explicit full marketplace reset, run the following only when the API is
idle and `MONGODB_URI` points to the dedicated staging/test database. It deletes
all documents in the app-owned `users`, `sessions`, `sellerProfiles`, `listings`,
`offers`, `transactions`, `conversations`, `messages`, and `notifications`
collections, then reseeds demo users, seller profiles, and listings. This logs
out every user and deletes all marketplace activity:

```bash
npm run seed:reset --workspace @atlas/api
```

Verify that the database is reachable by starting the API and checking the startup
logs for a successful MongoDB connection. If you need to run a startup check in a
local shell without changing the app state, use a direct MongoDB ping command with
your Atlas connection URI after replacing the credentials locally.

## Production Readiness

The API uses Fastify request IDs. A validated incoming `X-Request-Id` is reused
when present; otherwise the server generates one. The ID is returned in the
response header and safe API error payload, and structured request-completion
logs include method, route, status, duration, request ID and (when available)
the authenticated user ID. Slow requests use the configured
`SLOW_REQUEST_MS` threshold. Unexpected failures are logged server-side and
return a generic `INTERNAL_SERVER_ERROR` without stack traces or database
details. Business validation, authentication, authorization and conflict
errors retain stable client-safe codes.

`GET /health` is a liveness check. `GET /ready` is a lightweight readiness
check; MongoDB-backed startup supplies a `ping` dependency check, while the
in-memory demo is ready immediately. The API handles `SIGINT` and `SIGTERM`,
closes the Fastify app and event bus, and closes MongoDB connections during
shutdown. HTTP-only session cookies are secure in production, CORS is
configured with `CORS_ORIGIN`, and `VITE_*` values are the only configuration
intended for the browser. MongoDB URI, sessions, credentials and payment
provider secrets remain server-only.

The frontend normalizes network and HTTP failures into `ApiError`, preserves
the request ID for support diagnostics, clears expired sessions through the
existing centralized auth restore flow, and provides a recovery boundary for
unexpected React errors. WebSockets expose connecting, connected, reconnecting
and disconnected states, clean up the socket and retry timer, and never log
event contents. REST remains authoritative after reconnects.

Intentional limitations: the demo uses an in-process event bus, so multiple
API instances would need a shared broker or pub/sub layer; logs are intended
for a centralized log sink in deployment; metrics, tracing, alerting,
distributed rate limiting, CSRF policy, managed MongoDB backups and payment
provider integration remain deployment-level production work. MongoDB
repositories preserve explicit indexes and version/state checks; a production
settlement flow should use a MongoDB transaction or equivalent atomic
cross-document operation where required.

## Notifications and activity center

Commit 20 persists actionable user activity separately from transport events:

```text
Domain action -> MarketplaceEvent -> NotificationService -> repository
             -> recipient-scoped WebSocket -> Redux -> badge / Snackbar / activity center
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

`notification.created` is an additional recipient-scoped WebSocket event;
existing offer, message, transaction, and listing events continue to synchronize
their feature slices. Redux hydrates through REST, prepends and deduplicates
WebSocket notifications, reconciles unread counts after WebSocket reconnect,
and marks read state only when a notification is opened or the explicit
mark-all action is used. The activity center supports cursor pagination and
navigates through the existing listing, conversation, offer, and transaction
routes without embedding large domain objects.

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
Conversation -> Messages -> REST persistence -> recipient-scoped WebSocket -> Redux synchronization
```

The API derives buyer, seller and sender identity from the authenticated
session. Only the conversation participants can read, send, or mark messages
read; an unrelated authenticated user receives `403`, and unauthenticated
requests receive `401`. Public participant data is limited to id and display
name. Messages are trimmed plain text, limited to 2,000 characters, and never
rendered as HTML.

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

New `message.created` and `conversation.read` events use the existing WebSocket
event bus and are published only to the other participant. Redux deduplicates
message ids, preserves chronological order, updates previews and unread counts,
and continues to use REST as the source of truth after reconnects. A shared
broker plus replay-capable WebSocket gateway should be considered if scale
requires it.

Attachments, typing indicators, message editing/deletion, moderation, abuse
reporting, notification preferences, email/push notifications, and a brokered
WebSocket architecture are future extensions and are intentionally outside
Commit 19.

## Stripe Test Mode payments

Stripe is optional and defaults to the existing `DemoPaymentProvider`. To use
Stripe Test Mode, set `PAYMENT_PROVIDER=stripe` and configure
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the browser-safe
`STRIPE_PUBLISHABLE_KEY` in `.env`. The secret key and webhook secret are
server-only; only the publishable key is exposed through
`VITE_STRIPE_PUBLISHABLE_KEY`.

The payment boundary is:

```text
React + Redux -> POST /transactions/:id/payment-intent
  -> PaymentProvider -> Stripe PaymentIntent
  -> POST /webhooks/stripe -> signature verification
  -> idempotent transaction reconciliation -> notification/WebSocket -> Redux
```

The API derives the amount and buyer authorization from the transaction.
Existing amounts are major currency units, so Stripe conversion uses
deterministic minor unit conversion (for example, AED 10.00 becomes 1000). The transaction stores the provider reference, while card numbers, CVV, client secrets, and Stripe credentials are never persisted or placed in Redux.

For local forwarding, use the Stripe CLI with `stripe listen --forward-to
localhost:3000/webhooks/stripe` and copy the printed signing secret into
`STRIPE_WEBHOOK_SECRET`. Use Stripe's official test cards in the Atlas card
dialog, such as `4242 4242 4242 4242` for success and `4000 0000 0000 9995`
for a declined payment, with any future expiry and CVC. The webhook, not the
browser confirmation response, changes the Atlas transaction to paid.

PaymentIntent creation reuses the stored provider reference and sends an
idempotency key to Stripe. Webhook event ids are also used as Atlas payment
attempt keys, so replayed events do not duplicate transaction mutations,
notifications, or WebSocket updates. The DemoPaymentProvider remains available for
offline development and regression tests.

For the automated browser journey, place fresh rotated Stripe Test Mode keys in
the ignored `.env` and run `stripe listen` in a second terminal, then run
`npm run test:e2e:stripe`. The script creates an accepted demo transaction,
logs in as the buyer, enters the `4242 4242 4242 4242` test card, waits for
webhook reconciliation, and prints the transaction and PaymentIntent ids. View
the result in Stripe Dashboard with **Test mode** enabled under **Payments**;
open the PaymentIntent id printed by the script. The transaction id is also
stored in the PaymentIntent metadata.

Full Stripe Connect onboarding, KYC, payouts, platform fees, tax, and dispute
operations are intentionally out of scope. A production marketplace would use
connected seller accounts, explicit platform-fee and transfer policy, seller
onboarding/KYC, payout reconciliation, and the corresponding account, charge,
refund, dispute, and transfer webhooks. This implementation does not process
real money and makes no PCI-compliance claim.

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
`MarketplaceEventBus`; authenticated clients receive those events through the
WebSocket upgrade at `GET /events`, and Redux applies version-aware updates.

```text
REST command -> Repository -> Event Bus -> Authenticated WebSocket -> Redux -> React
```

WebSockets fit this implementation because updates flow primarily from server
to client while commands continue to use REST. The browser uses its native
WebSocket client with explicit exponential-backoff reconnection. The HTTP-only
session cookie authenticates the connection, and the API validates the request
origin. The bus maps user ids to listeners, so sellers receive
their listing offers and buyers receive only their own offer and listing events;
unrelated users are not subscribed to those events. Event payloads contain no
passwords, sessions, emails, or competing buyers' private negotiations.

Each event has a unique id and server timestamp. Offers and listings have a
server-controlled version; Redux ignores an event older than the state it already
holds. REST remains authoritative, and the client refreshes connection-dependent
unread notification counts after the WebSocket connects or reconnects. WebSocket
frames are ordered within a connection, but events sent while disconnected are
not replayed; other missed data must be refetched through REST. A production
replay-capable transport should use event ids and a shared log.

The current in-memory bus is reliable only for a single API instance. A scaled
deployment would publish domain events to a shared broker and deliver them from a
real-time gateway:

```text
API instances -> shared event broker -> real-time gateway -> WebSocket
```

Choose a managed broker and gateway based on the required fan-out and replay
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

## Render Deployment

This staging/demo uses a Render Static Site for the Vite frontend and a Render
Docker Web Service for the Fastify API, with MongoDB Atlas and Stripe Test Mode.
The root `render.yaml` defines both services and prompts for secrets without
committing values. The Static Site is free, and the API Blueprint explicitly
selects Render's Free compute plan.

### Step 1 — Create Render account

Create an account at [Render](https://render.com) and open the dashboard.

### Step 2 — Connect the Git repository

Connect the GitHub account that can access this repository. Select the
repository and deployment branch, then create a Blueprint from the root
`render.yaml`. Review both services before applying. Render prompts for
`sync: false` values during initial Blueprint creation. Add later secrets from
the relevant service's **Environment** page.

### Step 3 — Create API service

The Blueprint creates a Docker **Web Service** from the repository root; leave
the root directory unset. Render builds from the root `Dockerfile`, which runs
the existing workspace build, and starts `node apps/api/dist/server.js` via
its Docker `CMD`. The API binds to `0.0.0.0` and uses Render's injected `PORT`.
Set health check path `/health`; `/ready` separately pings MongoDB.

Set these API environment values in Render: `NODE_ENV=production`,
`HOST=0.0.0.0`, `MONGODB_URI`, `MONGODB_DB_NAME=atlas_marketplace`,
`CORS_ORIGIN`, `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, and
`STRIPE_WEBHOOK_SECRET`. Set `CORS_ORIGIN` to the exact deployed frontend
origin, without a path or trailing slash. The API has no `SESSION_SECRET`;
opaque session IDs are stored server-side in MongoDB. Do not set a fixed `PORT`;
Render supplies it.

Use one API instance for this demo because the recipient-scoped event bus is
in-memory and does not share state across instances. Render Web Services
support WebSocket upgrades. On the Free plan, the API spins down after 15
minutes without inbound traffic; its next HTTP or WebSocket request can take
about a minute to wake it. Free instances have 512 MB RAM, 0.1 CPU, ephemeral
filesystems, and a shared 750 free-instance-hour monthly allowance per
workspace. Keep MongoDB Atlas as persistent storage; do not store application
data on the API filesystem. This is suitable for a demo, not production uptime.

### Step 4 — Create frontend service

The Blueprint creates a **Static Site** from the repository root; leave the
root directory unset. Build command: `npm ci && npm run build`. Publish
directory: `apps/web/dist`. The Blueprint adds the SPA rewrite `/*` to
`/index.html`. Set `VITE_API_URL` to the deployed API's HTTPS URL and
`VITE_STRIPE_PUBLISHABLE_KEY` to a Stripe Test Mode publishable key in the
Static Site's **Environment** settings, then trigger a new deploy because Vite
embeds these public values at build time. Never put server secrets in `VITE_*`.
After Render assigns both service URLs, set `CORS_ORIGIN` on the API to the
exact frontend origin and redeploy the API; rebuild the Static Site after
setting its `VITE_API_URL`.

The API allows credentials and, in production, only the configured frontend
origin. Frontend API requests use `credentials: include`. The production
session cookie is host-only, `HttpOnly`, `Secure`, `SameSite=None`, and
`Partitioned` for browser support across the default cross-site Render hosts;
locally it uses `SameSite=Lax`. Custom frontend and API domains under the same
registrable domain remain the most compatible option. Do not expose session IDs
to JavaScript or weaken `Secure`.

### Step 5 — Configure MongoDB Atlas

In Atlas, create or select a test cluster, create the `atlas_marketplace`
database with an initial collection (for example, `users`), and create a
dedicated database user with `readWrite` access to that database and a strong
password. Copy its `mongodb+srv` connection string, URL-encode reserved
characters in the password, and set the URI as `MONGODB_URI` in the Render API
service. Set `MONGODB_DB_NAME=atlas_marketplace`. The API checks for an existing
collection before creating indexes, so it will not bootstrap an empty/missing
database; it fails rather than falling back to in-memory persistence when
production MongoDB configuration is missing. No Atlas or Render database is
provisioned by the Blueprint.

In Atlas **Network Access**, allow the API service's Render outbound ranges.
Find the ranges for that service in Render **Connect → Outbound**, then
allowlist the displayed CIDRs in Atlas. Ranges can be shared by services in the
same region; do not guess an IP or use `0.0.0.0/0`. If Atlas requires dedicated
egress addresses, configure Render dedicated outbound IPs and allowlist those.
Static sites do not need database network access.

### Step 6 — Configure Stripe

Use Stripe Dashboard **Test mode** only. In API service **Environment**
settings, set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY` to a test secret
key (`sk_test_...` or `rk_test_...`), and `STRIPE_WEBHOOK_SECRET` to the test
endpoint signing secret. Production-like API startup rejects live secret keys.
Set only the public test key (`pk_test_...`) as `VITE_STRIPE_PUBLISHABLE_KEY`
on the Static Site. Never expose API secrets to the browser or paste secrets
into chat.

After the API is deployed, create a webhook endpoint in Stripe Test mode at
`https://<render-api-domain>/webhooks/stripe`. Subscribe to
`payment_intent.succeeded` and `payment_intent.payment_failed`, then copy the
test signing secret into `STRIPE_WEBHOOK_SECRET` in Render and redeploy. Verify
delivery and successful responses in Stripe Dashboard **Developers → Webhooks**.
The API verifies the raw request signature and deduplicates event IDs.

### Step 7 — Verify deployment

Smoke-test unauthenticated `/health` (`200`, liveness only) and `/ready` (`200`
when MongoDB is available), then verify the home page and direct React-route
refresh, login/session restoration/logout, listings, offers, transactions,
messaging, notifications and authenticated `/events` WebSocket updates. Complete
a Stripe Test Mode payment and verify webhook delivery and transaction
reconciliation. CI runs the repository quality checks; no live deployment is
claimed here.

For local development, run `npm ci`, then start the frontend with `npm run dev`
and the API separately with `npm run dev:api`.
