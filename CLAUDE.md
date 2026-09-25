# CLAUDE.md

White-label prepaid wallet + loyalty platform for local chains in Panamá (3–15 locations). Customers preload money, pay with a QR code at the register, and earn rewards. First pilot client: La Rana Dorada (craft brewery, several pubs).

Read these before starting any task:
- `docs/PRODUCT.md` — what we're building and for whom
- `docs/ARCHITECTURE.md` — stack, structure, and portability rules
- `docs/LEDGER.md` — how money is recorded (most critical part)
- `docs/MILESTONES.md` — build order and what "done" means
- `docs/OPEN_QUESTIONS.md` — things not decided yet; don't assume, ask

## Non-negotiable rules

1. **Multi-tenant from day one.** Every table has `tenant_id` with row-level security. No client-specific code: client differences are configuration or optional modules.
2. **Balances come only from the ledger.** Never store an editable balance. Every movement is an immutable, double-entry transaction. Corrections are new transactions, never edits or deletes.
3. **We never hold money.** Top-ups settle into the client's own payment accounts. The platform only records confirmations. Never store card data.
4. **Credit a wallet only after a confirmed payment** from the provider (webhook), never on the customer's redirect.
5. **Every external service sits behind an adapter** (payments, POS, messaging) with a mock implementation for tests and demos.
6. **Stay portable.** Standard PostgreSQL only; business logic in our code, not in vendor-specific functions; config via environment variables; database changes as SQL migrations in the repo.
7. **No real money until the independent code review is done.** Test and sandbox credentials only.

## How to work

- Propose a plan and wait for approval before building a new milestone.
- Write tests for anything touching money; ledger tests must pass before merging.
- Small commits with clear messages; one milestone per branch.
- Keep docs updated when a decision changes. Add new decisions to the "Decision log" at the end of `docs/ARCHITECTURE.md`.
- If something in the docs seems wrong or unclear, say so instead of guessing.
- UI text in Spanish and English (Spanish default).
