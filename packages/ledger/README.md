# @wallet/ledger

The only code allowed to write money movements. Everything else reads.

## Account model

Per customer, per tenant: `paid_funds`, `bonus_funds` (money, in the tenant's currency) and `points`.

Per tenant, the counterpart accounts every entry balances against:

| Money                    | Points               |
| ------------------------ | -------------------- |
| `topups_received`        | `points_issued`      |
| `cash_received`          | `points_redeemed`    |
| `bonus_issued`           | `points_adjustments` |
| `sales_redeemed`         |                      |
| `refunds_paid`           |                      |
| `adjustments`            |                      |
| `gift_cards_outstanding` |                      |

Sign convention: customer accounts are positive = owed to the customer. Tenant accounts hold the other side and may go negative. The sum of all customer money balances is the client's liability.

Amounts are integers: minor units (cents) for money, whole points for points. Never floats.

## Operations

| Method           | Type                | Entries                                                |
| ---------------- | ------------------- | ------------------------------------------------------ |
| `topUp`          | `top_up` (+ `bonus_credit`) | paid_funds ↑, topups_received ↓ (bonus: bonus_funds ↑, bonus_issued ↓) |
| `cashTopUp`      | `cash_top_up`       | paid_funds ↑, cash_received ↓                          |
| `charge`         | `payment`           | bonus/paid ↓ per tenant spend order, sales_redeemed ↑; optional points ↑, points_issued ↓ |
| `redeemPoints`   | `reward_redemption` | points ↓, points_redeemed ↑                            |
| `void`, `refund` | `void`, `refund`    | exact mirror of the original; one reversal per original |
| `adjust`         | `manual_adjustment` | customer account ±, adjustments ∓; reason required     |

Gift card types exist in the enum; their API arrives in M5.

Every write takes an `idempotencyKey` derived from the source event. The same key returns the same transaction (`replayed: true`); the same key with a different request throws `IdempotencyConflictError`.

The ledger is policy-free: it does not know about void windows, bonus tiers or limits. Those live in `@wallet/core` and the apps.

## What the database enforces (independently of this code)

- Entries of a transaction sum to zero per unit; all money entries share one currency
- Customer balances never go negative (`CHECK` on the balance row every concurrent write must lock)
- Transactions, entries and accounts can not be updated or deleted, by any role
- A void/refund's entries are the exact negation of the original's
- Only `wallet_ledger` may insert ledger rows; `wallet_app` is read-only on them

`verifyBalances(tenantId)` recomputes every cached balance from its entries and returns the drift, if any. It is the reconciliation primitive and runs in the tests.
