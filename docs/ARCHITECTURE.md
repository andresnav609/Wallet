# Architecture

## Stack (Option A — can migrate later)
- Next.js (TypeScript), Tailwind, a component library of your choice
- Supabase: PostgreSQL + auth (plan: Pro)
- Vercel hosting
- Monorepo (e.g. Turborepo / pnpm workspaces)

Upgrade path: Supabase Team (compliance) or AWS/Google Cloud if a client requires it. Design so this is a configuration and hosting change, not a rewrite.

## Suggested structure (adjust if you have a better idea — explain why)

```
apps/
  customer/   PWA, served on each client's domain
  cashier/    tablet app
  admin/      client administrators
  team/       our support + developer console
packages/
  db/         schema, SQL migrations, typed queries
  ledger/     the only code allowed to write money movements
  core/       business rules: bonuses, points, limits, QR tokens
  adapters/   payments (mock, yappy, card gateway), pos (mock, manual), messaging (mock, whatsapp)
  ui/         shared design system, theming per tenant
```

## Portability rules
- Standard PostgreSQL features only; no business logic in vendor-specific functions
- Auth accessed through one module so the provider can be swapped
- Everything configurable via environment variables
- App must also run in Docker
- Weekly database export to storage outside the database provider

## Adapters
Each adapter has an interface, a mock, and one or more real implementations.

| Adapter | Mock | Real (later) |
| --- | --- | --- |
| Payments | Simulates approved, declined, delayed and duplicate confirmations | Yappy payment button; a Panamanian card gateway (e.g. PagueloFacil) — credentials per tenant |
| POS | A simple fake POS screen that issues ticket numbers | Level 1: manual (authorization code). Later: Invu API or Oracle Simphony driver |
| Messaging | Codes/receipts shown in logs | WhatsApp or SMS provider |

## Hardware
- Android tablets in kiosk mode running the cashier app in the browser
- 2D USB scanner (e.g. Zebra DS2208) acting as a keyboard that sends Enter after each code; camera scan as fallback

## Security
- Row-level security by tenant; role-based permissions (customer, cashier, manager, owner, support, developer)
- Audit log for every sensitive action
- Rate limits on login, top-up, and charge endpoints
- Idempotency keys on every money operation

## Decision log
- Single-merchant balances only (keeps us outside e-money regulation).
- Money settles to the client's accounts; we never hold funds.
- Balances never expire.
- Start on Supabase Pro + Vercel; keep portable.
- (M1) Apps reach the database only through our server-side code, never from the browser. Row-level security keys off a transaction-local setting (`set_config('app.tenant_id', …, true)` read by `app.current_tenant()`), not on any auth provider's JWT claims, so the auth provider and host can change without touching policies.
- (M1) Two database roles: `wallet_app` (RLS-bound, read-only on ledger tables) and `wallet_ledger` (RLS-bound, the only role that can insert ledger rows; only `packages/ledger` receives its credential). Nobody can update or delete ledger rows.
- (M1) Money is stored as `bigint` minor units with an ISO 4217 currency code on each tenant and each money account. Entries of one transaction sum to zero per unit (money, points) and all money entries share one currency. Points are whole integers; rates and rounding are tenant configuration (M5).
- (M1) Spend order (`bonus_first` default, or `paid_first`) is a column on `tenants`. The ledger allocates a charge accordingly; other policies (void window, limits, tiers) live in `core`/apps, the ledger stays policy-free.
- (M1) Migrations are plain SQL files in `supabase/migrations/` (Supabase CLI naming) applied by our own runner to any PostgreSQL; local dev and CI use `postgres:16` in Docker.
