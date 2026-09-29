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
