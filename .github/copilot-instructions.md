# Atlas Marketplace engineering instructions

## Architecture

- Keep the npm workspace layout and strict TypeScript configuration.
- Use React, Material UI, and Redux Toolkit in `apps/web`.
- Use Fastify, MongoDB repositories, Stripe test mode, and authenticated SSE/WebSocket events in `apps/api`.
- Keep shared domain types in `packages/types` and runtime boundary validation in `packages/validation`.
- Route all browser HTTP requests through the central API client. Components must not call `fetch` directly.
- Keep presentation components focused on rendering; move reusable business logic into hooks, API modules, Redux thunks/selectors, or domain utilities.

## Coding standards

- Prefer existing components, helpers, theme tokens, and repository patterns before adding abstractions.
- Use Material UI components and icons with accessible labels/tooltips.
- Design mobile-first and preserve keyboard, focus, loading, error, and empty states.
- Avoid `any`, unsafe casts, duplicated API logic, magic values, and client-trusted authorization data.
- Add or update types and Zod schemas when external data changes.
- Never log credentials, tokens, payment secrets, MongoDB URIs, or message contents.

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
