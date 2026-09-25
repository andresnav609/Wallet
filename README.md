# Wallet Platform

White-label prepaid wallet + loyalty platform for local chains. `CLAUDE.md` is the entry point for anyone (human or agent) working here; `docs/` holds product, architecture, ledger and milestone decisions.

## Layout

```
apps/                 customer, cashier, admin, team (from M2)
packages/db           PostgreSQL client with tenant context, migration runner, roles, test DB helpers
packages/ledger       the only code that writes money movements
packages/core         business rules (from M3)
packages/adapters     payments / POS / messaging behind interfaces (from M2)
packages/ui           shared design system (from M2)
supabase/migrations   plain SQL migrations, applied by packages/db or the Supabase CLI
scripts/seed.ts       "Demo Club" tenant with realistic activity
```

## Local setup

Requirements: Node 22, pnpm (via `corepack enable`), Docker Desktop.

```bash
cp .env.example .env
pnpm install
pnpm db:up        # PostgreSQL 16 in Docker, exposed on localhost:5433
pnpm db:setup     # creates the wallet_app / wallet_ledger roles and applies migrations
pnpm db:seed      # optional: Demo Club tenant
pnpm test         # every package's tests, against real PostgreSQL
```

Tests create a throwaway database per test file from a migrated template, so they run in parallel and leave nothing behind. CI does the same against a `postgres:16` service container; the ledger tests must pass before anything merges.

## Rules that the code enforces

See `CLAUDE.md`. In short: multi-tenant with row-level security everywhere; balances only from an immutable double-entry ledger; only `packages/ledger` can write money; every external service behind an adapter with a mock; plain PostgreSQL only.
