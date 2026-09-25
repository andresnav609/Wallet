# Ledger

The ledger is the heart of the system. Treat it like accounting software.

## Principles
- Double-entry: every transaction has entries that sum to zero.
- Immutable: no updates or deletes on transactions or entries. Corrections are reversing transactions with a reason and the user who made them.
- Balances are always computed from entries (a cached balance is fine only if it's derived and verifiable).
- Every money operation is idempotent (same request twice = one transaction).
- No balance can go negative.

## Accounts (per customer, per tenant)
- Paid funds
- Bonus funds
- Points

Plus tenant-level accounts as needed (e.g. "top-ups received", "sales redeemed", "bonus issued") so every entry has a counterpart.

## Transaction types
Top-up, bonus credit, payment, reward redemption, void, refund, manual adjustment, gift card purchase, gift card claim, cash top-up.

## Rules to decide per tenant (configuration)
- Spend order: bonus funds first or paid funds first
- Bonus tiers, points rate, limits

## Reconciliation (daily)
- Provider confirmations vs. top-ups in the ledger
- Cashier charges (with authorization codes) vs. POS records
- Total customer balances = client's liability

## Tests that must always pass
- Entries of every transaction sum to zero
- Balance can never go negative, including under concurrent charges
- Duplicate webhook or duplicate charge request creates only one transaction
- A void/refund exactly reverses the original
- No code path outside `packages/ledger` can write money movements

## Implemented in M1 (see `packages/ledger/README.md`)

- Chart of accounts: customer `paid_funds`, `bonus_funds`, `points`; tenant `topups_received`, `cash_received`, `bonus_issued`, `sales_redeemed`, `refunds_paid`, `adjustments`, `gift_cards_outstanding`, `points_issued`, `points_redeemed`, `points_adjustments`.
- Currency: ISO 4217 code per tenant and per money account; amounts are `bigint` minor units. One transaction balances per unit and never mixes currencies (enforced by the database).
- Sign convention: customer accounts positive = owed to the customer; tenant counterpart accounts may go negative. Sum of customer money balances = the client's liability.
- Balances: `ledger_balances` is a trigger-maintained cache with a `CHECK (balance >= 0)` for customers; `verifyBalances` recomputes from entries and reports drift.
- Idempotency: `(tenant_id, idempotency_key)` is unique; a reused key with a different request is rejected.
