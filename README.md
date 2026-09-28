# Atlas Marketplace

Atlas Marketplace is a marketplace concept for authenticated luxury and collectible watches, connecting buyers and sellers through discovery, valuation, offers, negotiation and transaction workflows.

## Project status

Commit 01 establishes the TypeScript monorepo foundation and minimal frontend and backend applications. Marketplace features will be added in later commits.

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
