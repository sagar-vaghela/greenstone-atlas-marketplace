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

## Offers and negotiation

- Offers use `pending`, `countered`, `accepted`, `rejected`, `withdrawn`, and `expired` states. A counter is a new immutable offer linked with `parentOfferId`; historical amounts are never overwritten.
- REST endpoints are `GET /listings/:listingId/offers`, `GET /offers/:id`, `POST /listings/:listingId/offers`, `PATCH /offers/:id/status`, and `POST /offers/:id/counter`.
- Offer state is kept in the Redux Toolkit `offers` slice, so future real-time events can dispatch the same reducers used by REST mutations.
- The current `x-demo-role` identity boundary is temporary and intentionally not authentication. Commit 15 should replace it with session identity and ownership authorization.
- Acceptance marks the listing sold and rejects competing actionable offers. The current repository flow is guarded with conditional updates; production MongoDB should use a transaction or stronger atomic cross-document operation for race-free settlement.
- Amounts currently use numbers to match the existing listing model. Production money should move to integer minor units or a decimal-safe representation.

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
