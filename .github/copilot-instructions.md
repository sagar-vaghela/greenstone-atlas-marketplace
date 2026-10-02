# Atlas Marketplace engineering instructions

## Architecture

- Keep the npm workspace layout and strict TypeScript configuration.
- Use React, Material UI, and Redux Toolkit in `apps/web`.
- Use Fastify, MongoDB repositories, Stripe test mode, and authenticated SSE/WebSocket events in `apps/api`.
- Keep shared domain types in `packages/types` and runtime boundary validation in `packages/validation`.
- Route all browser HTTP requests through the central API client. Components must not call `fetch` directly.
- Keep presentation components focused on rendering; move reusable business logic into hooks, API modules, Redux thunks/selectors, or domain utilities.
- Treat REST responses as authoritative after realtime reconnects; realtime events are recipient-scoped notifications and Redux synchronization hints, not an authorization boundary.

## Product context

- Atlas Marketplace is an AED-only marketplace for authenticated luxury and collectible watches.
- Support both fixed-price listings and auctions. Auction state belongs to the server and includes an expiry, optional reserve price, current winning bid, and monotonic version.
- The primary workflows are discovery, listing creation/editing, offer negotiation, auction bidding, transaction payment, shipping, delivery confirmation, completion, disputes, and messaging.
- Preserve the separation between marketplace concepts: offers are negotiated against listings, bids belong to auctions, and transactions are created only by valid server-side transitions.
- The in-memory repository is a deterministic local/demo adapter; MongoDB Atlas is the production persistence adapter. Do not make UI behavior depend on the adapter.
- Stripe is test-mode infrastructure behind the payment provider abstraction. A verified webhook, not a browser success response, is the source of truth for a paid transaction.

## Feature implementation skills

- For a new user-facing workflow, trace the complete path before editing: shared type, Zod validation, API route, repository contract and adapters, event payload, Redux/API client integration, UI state, focused tests, and Playwright journey.
- For auction changes, enforce server-side ownership, auction status/expiry, minimum bid, reserve-price, and optimistic-concurrency checks. Use the repository's conditional update rather than read-then-write logic.
- For money changes, keep amounts in AED major units at domain boundaries, validate currency as `AED`, avoid floating-point comparisons where precision matters, and convert to Stripe minor units only inside the payment integration.
- For transaction and offer changes, preserve participant authorization, allowed state transitions, idempotency, and version checks. Never trust client-provided seller, bidder, buyer, price, status, or payment state.
- For realtime changes, publish only the minimum recipient-scoped payload, avoid secrets and message content in logs, and ensure reconnects can recover through an authoritative REST refresh.
- For frontend changes, use existing Material UI/theme tokens, accessible labels, keyboard/focus behavior, and explicit loading, empty, error, and disabled states. Keep API calls in the central client and avoid duplicating server business rules in components.

## Coding standards

- Prefer existing components, helpers, theme tokens, and repository patterns before adding abstractions.
- Use Material UI components and icons with accessible labels/tooltips.
- Design mobile-first and preserve keyboard, focus, loading, error, and empty states.
- Avoid `any`, unsafe casts, duplicated API logic, magic values, and client-trusted authorization data.
- Add or update types and Zod schemas when external data changes.
- Never log credentials, tokens, payment secrets, MongoDB URIs, or message contents.
- Keep user-visible currency labels and formatting consistent with AED and the existing locale helpers.
- Prefer explicit domain errors that map to the repository's API error shape; do not swallow conflicts, validation failures, authorization failures, or provider errors.

## Change checklist

Before considering a feature complete:

1. Identify affected shared types, validation schemas, API routes, repositories, events, client modules, state, and screens.
2. Update both in-memory and MongoDB implementations when persistence behavior changes, including required indexes and seed/reset fixtures.
3. Cover happy paths and rejected paths: unauthenticated access, wrong participant, stale version, invalid transition, expired auction, insufficient bid, and provider failure where applicable.
4. Update the README/runbook or other directly related documentation when the user flow, environment variables, migration steps, or operational behavior changes.
5. Verify the smallest focused tests first, then the repository quality gates below. Report anything not run.

## Testing and verification

User-facing features require focused unit tests and Playwright coverage for the critical user journey when applicable. Before completion, run:

```text
npm run lint
npm run typecheck
npm test -- --run
npm run coverage
npm run build
npm run test:e2e
npm ls --workspaces --depth=0
git diff --check
```

Do not claim deployment, Atlas persistence, Stripe webhook delivery, SSE behavior, or a coverage target unless it was actually verified. Report implemented, verified, not verified, and known limitations separately.

## Security

Never commit API keys, Stripe secrets, MongoDB credentials, session secrets, webhook secrets, or real user data. Frontend environment variables must be public-safe `VITE_*` values only. Preserve server-side authorization, payment idempotency, request IDs, and production configuration fail-fast behavior.

## AI-assisted changes

Review and adapt generated code to the existing architecture. Make surgical changes, remove dead code only after checking references, update directly related documentation, and do not commit automatically.
