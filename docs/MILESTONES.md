# Milestones

One milestone per session/branch. Propose a plan first; don't start the next milestone until the current "done when" is met.

| # | Milestone | Done when |
| --- | --- | --- |
| M1 | Monorepo, database schema, multi-tenant security, ledger package | All ledger tests in `LEDGER.md` pass |
| M2 | Customer app: sign-up, wallet, top-up with mock payments | On a phone: sign up, top up (mock), see balance + bonus |
| M3 | Cashier app: charge, void, cash top-up, scanner + camera input, rotating offline QR | Pay a fake bill by scanning a phone in under 10 seconds |
| M4 | Fake POS + authorization codes + admin dashboard basics | Fake POS tickets and ledger reconcile automatically |
| M5 | Points, rewards, bonuses, gift cards, limits | Configurable per tenant; tests cover spend order and limits |
| M6 | Team console: create a client in minutes, support lookup, audit log, monitoring | New demo client configured without code changes |
| M7 | Real sandbox integrations (Yappy, card gateway, WhatsApp), Wallet passes | Sandbox payments credit only after confirmed webhooks |
| M8 | Hardening for review: rate limits, backups/export, docs | Ready for the independent code review |

Always keep a demo tenant ("Demo Club") with realistic seed data for sales demos.
