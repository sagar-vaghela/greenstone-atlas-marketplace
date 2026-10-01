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

For an explicit reset of the seeded collections (only when you intend to wipe the
local demo data), run:

```bash
npm run seed:reset --workspace @atlas/api
```

Verify that the database is reachable by starting the API and checking the startup
logs for a successful MongoDB connection. If you need to run a startup check in a
local shell without changing the app state, use a direct MongoDB ping command with
your Atlas connection URI after replacing the credentials locally.

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
API instances -> EventBridge / SNS / SQS / Redis -> Real-time gateway -> WebSocket
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

## CI/CD and AWS staging readiness

The repository is already structured for a simple, secure AWS staging deployment without introducing unnecessary services or a second cloud provider. The target pattern is:

```text
GitHub
  -> GitHub Actions CI
  -> static frontend build
  -> S3 + CloudFront
  -> API container
  -> ECS / Fargate
  -> MongoDB Atlas
  -> Stripe Test API
```

### Deployment architecture

```text
                    GitHub
                       │
                       ▼
               GitHub Actions
                       │
                CI / Build / Test
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
     Frontend static build      API container
          │                         │
          ▼                         ▼
       S3 + CloudFront          ECS / Fargate
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                    MongoDB Atlas           Stripe Test API
```

Responsibilities:

- GitHub Actions handles CI and future staging deploys.
- The frontend is a static Vite build served from S3 behind CloudFront.
- The Fastify API runs as a container in ECS Fargate with an HTTP health check and environment-derived secrets.
- MongoDB Atlas remains the authoritative data layer for production-like environments.
- Stripe remains in test mode for staging and demo usage only.

### CI pipeline

The repository includes `.github/workflows/ci.yml` with the requested CI checks:

```bash
npm ci
npm run typecheck
npm test -- --run
npm run build
npm ls --workspaces --depth=0
git diff --check
```

It runs on pull requests and on pushes to `main`. The workflow uses the minimal `contents: read` GitHub permission and no application secrets. This keeps the pipeline safe for public or internal repos while still verifying the TypeScript build, test suite, workspace integrity, and patch hygiene.

### Environment strategy

```text
Local
  -> developer machine
  -> MongoDB Atlas test connection or in-memory demo for local-only testing

Staging / Demo
  -> GitHub Actions deploys static frontend + ECS API
  -> MongoDB Atlas test database
  -> Stripe Test API

Production
  -> protected deployment only
  -> real production database and production credentials
  -> no auto-deploy from arbitrary pull requests
```

The app is already configured to fail fast in production-like environments when `MONGODB_URI` is missing, which prevents accidental in-memory fallbacks in staging or production.

### Secrets and runtime configuration

The implementation uses only the environment variables it actually reads:

- API server: `NODE_ENV`, `HOST`, `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, `SLOW_REQUEST_MS`, `SESSION_TTL_MS`, `PAYMENT_PROVIDER`, `MONGODB_URI`, `MONGODB_DB_NAME`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- Frontend browser-safe: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
- E2E: `E2E_BASE_URL`, `E2E_API_URL`

There is no `SESSION_SECRET` in the current implementation, so it is intentionally omitted from the repo template. Secrets remain server-side and should be stored in GitHub Actions secrets or AWS Secrets Manager / SSM Parameter Store, not in the repo or in the browser bundle.

### MongoDB Atlas and startup behavior

MongoDB is the persistence layer for staging and production, and the API intentionally throws when `MONGODB_URI` is missing in production-like environments. This is enforced by the app config and prevents a dangerous silent fallback to in-memory repositories.

Required behavior:

- Use a MongoDB Atlas test database for staging/demo
- Keep the connection string in GitHub secrets or AWS Secrets Manager, never in git
- Create indexes through the MongoDB repositories and startup seed logic as needed
- Confirm startup by checking the server logs and the `GET /health` and `GET /ready` endpoints
- If MongoDB is unavailable, the API should fail startup or report the dependency as not ready via `/ready` rather than pretending the app is healthy

No destructive database reset or wipe should be run automatically as part of this deployment workflow.

### Stripe Test Mode and webhooks

This app remains on Stripe Test Mode only. The deployment architecture is intentionally:

```text
React
  -> API
  -> Stripe Test API
```

Implementation rules:

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` stay server-side only
- `VITE_STRIPE_PUBLISHABLE_KEY` is the only browser-safe Stripe key
- The browser never receives the secret key
- The app does not switch to live payments unless a separate production authorization is explicitly added later
- Webhook configuration uses the staging API URL and the test signing secret

The current app already uses the correct separation between server secrets and browser-safe public config.

### API health endpoint

The existing health route is suitable for ECS health checks and load-balancer readiness checks:

- `GET /health` returns a basic liveness status
- `GET /ready` performs a MongoDB ping when MongoDB is configured and returns `503` if the dependency is unavailable
- No secrets or sensitive deployment configuration are exposed in either endpoint

This is suitable for ECS/Fargate container health checks, target group health checks, and deployment verification.

### AWS setup required before deployment

AWS infrastructure is not created in this repo, and actual deployment must wait for a real AWS account and credentials. The repo is prepared for the following manual setup.

1. AWS account
   - Create or use an AWS account with permissions to manage S3, CloudFront, ECS/Fargate, IAM, and Secrets Manager.
   - Use a dedicated demo or staging environment rather than production credentials.

2. Region
   - Recommended demo region: `us-east-1`
   - Reason: broad AWS service availability, strong CloudFront coverage, and straightforward ECS/Fargate support for a demo deployment.

3. IAM / GitHub OIDC
   - Prefer GitHub Actions OIDC over long-lived AWS access keys.
   - Configure an IAM role that `sts:AssumeRoleWithWebIdentity` trusts the GitHub repo and branch, for example:
     - repo: `Greenstone/atlas-marketplace`
     - branch: `main`
   - Add that role ARN as a GitHub Actions secret or environment variable for the deploy job.
   - Minimal trust pattern: repo-specific OIDC with `sub` matching `repo:<owner>/<repo>:ref:refs/heads/main` and `aud` set to `sts.amazonaws.com`.

4. S3
   - Create a static website or CloudFront origin bucket for the React app.
   - Keep public access blocked unless you explicitly want a private CloudFront distribution with signed URLs; for a typical SPA, CloudFront is the public edge front door and S3 remains private behind it.
   - Configure the bucket for static hosting or an OAC origin connection if using CloudFront.

5. CloudFront
   - Create a distribution fronting the S3 bucket.
   - Set the default root object to `index.html`.
   - Add a SPA error response configuration so `/some-route` falls back to `/index.html` rather than returning a 404.
   - Use the API as a separate origin or a second CloudFront behavior as needed for a different path prefix.

6. ECS / Fargate
   - Create an ECS cluster for the API.
   - Define a task definition with a single container for the API image.
   - Use an ECS service with Fargate launch type.
   - Set CPU and memory to a small, demo-friendly baseline such as 256/512 or 512/1024 depending on the load profile.
   - Expose port `3000` and configure the container health check to call `GET /health`.
   - Set environment variables for runtime config and read secrets from AWS Secrets Manager or SSM Parameter Store.

7. Networking
   - Keep the interview setup simple: one public-facing frontend distribution, one API service, and basic VPC networking.
   - Use the minimum necessary security group and route configuration for ECS/Fargate.
   - Do not introduce more VPC complexity than the demo requires.

8. Secrets Manager / SSM
   - Store runtime environment values in AWS Secrets Manager or SSM Parameter Store.
   - Use the following values as needed:
     - `MONGODB_URI`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `STRIPE_PUBLISHABLE_KEY` (if used by the backend or shared config)
     - `VITE_API_URL` as a build-time or deployment-time frontend value, if the app is configured to inject it during the static build
   - Never bake MongoDB or Stripe credentials into the Docker image.

9. MongoDB Atlas network access
   - Allow the ECS task or NAT gateway IP range to reach the Atlas cluster.
   - Use an Atlas test database connection string rather than production credentials for the demo.
   - Confirm that the cluster allows the AWS environment to connect securely.

10. Stripe webhook URL
   - Configure the Stripe webhook to point to the staging API endpoint, for example `https://api-staging.example.com/webhooks/stripe`.
   - Set the test signing secret in the environment and AWS Secrets Manager.

11. Required GitHub secrets
   - These are the eventual values to add when the AWS resources exist:
     - `AWS_REGION`
     - `AWS_ROLE_TO_ASSUME` or the equivalent OIDC role ARN
     - `MONGODB_URI`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `STRIPE_PUBLISHABLE_KEY`
     - `VITE_API_URL` when the frontend is built with a staging API origin

### Deployment smoke test (after real AWS resources are available)

When the staging deployment exists, the smoke test should verify the following sequence:

```text
Frontend loads
  -> login works
  -> API health works
  -> MongoDB persistence works
  -> marketplace listing loads
  -> offer flow works
  -> messaging works
  -> notifications work
  -> Stripe test payment works
  -> transaction updates
```

This repository does not claim that the live AWS deployment has been executed because AWS resources and credentials are not yet available in this workspace.

### Rollback approach

The simplest rollback path is:

1. Keep the last known-good build artifact and ECS task definition revision.
2. Redeploy the previous task definition for the API.
3. Revert the frontend static site to the previous S3/CloudFront artifact or previous distribution version.
4. Validate `/health`, `/ready`, and a minimal listing fetch after rollback.

Because this is a staging/demo environment, rollback should be intentionally simple and manual while the infrastructure is being created.

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
unexpected React errors. WebSockets expose connecting, connected, reconnecting and
disconnected states, clean up the socket and retry timer, and never log event
contents. REST remains authoritative after reconnects.

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

`notification.created` is an additional recipient-scoped WebSocket event; existing
offer, message, transaction, and listing events continue to synchronize their
feature slices. Redux hydrates through REST, prepends and deduplicates WebSocket
notifications, reconciles unread counts after WebSocket reconnect, and marks read
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
Conversation -> Messages -> REST persistence -> recipient-scoped WebSocket -> Redux synchronization
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

New `message.created` and `conversation.read` events use the existing WebSocket event
bus and are published only to the other participant. Redux deduplicates message
ids, preserves chronological order, updates previews and unread counts, and
continues to use REST as the source of truth after reconnects. A shared broker
plus replay-capable WebSocket gateway should be considered if scale requires it.

Attachments, typing indicators, message editing/deletion, moderation, abuse
reporting, notification preferences, email/push notifications, and a brokered
WebSocket architecture are future extensions and are intentionally outside
Commit 19.

````

## Stripe Test Mode payments

Stripe is optional and defaults to the existing `DemoPaymentProvider`. To use
Stripe Test Mode, set `PAYMENT_PROVIDER=stripe` and configure
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the browser-safe
`STRIPE_PUBLISHABLE_KEY` in `.env`. The secret key and webhook secret are
server-only; only the publishable key is exposed through `VITE_STRIPE_PUBLISHABLE_KEY`.

The payment boundary is:

```text
React + Redux -> POST /transactions/:id/payment-intent
  -> PaymentProvider -> Stripe PaymentIntent
  -> POST /webhooks/stripe -> signature verification
  -> idempotent transaction reconciliation -> notification/WebSocket -> Redux
````

The API derives the amount and buyer authorization from the transaction. Existing
amounts are major currency units, so Stripe conversion uses deterministic minor
unit conversion (for example, AED 10.00 becomes 1000). The transaction stores
the provider reference, while card numbers, CVV, client secrets, and Stripe
credentials are never persisted or placed in Redux.

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
