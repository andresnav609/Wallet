# Product

## What it is
A white-label platform each client brands as its own program (e.g. "Rana Club"). A customer's balance is usable only at that client's locations (single-merchant wallet).

## Business model
We sell setup + a monthly fee per location and manage only the technology. The client runs the program (promos, rewards, marketing, customer support).

## Users and interfaces

| Interface | User | Core jobs |
| --- | --- | --- |
| Customer app (PWA) | End customer | Sign up by phone + WhatsApp code, see balance/points, top up, show QR to pay, history, rewards, gift cards, add to Apple/Google Wallet |
| Cashier app | Cashier on a tablet at the register | PIN login, charge (scan QR via USB scanner or camera), redeem reward, cash top-up, void within 10 min, shift summary |
| Admin dashboard | Client's owners and managers ("administrators") | Balances held, activity by location, customers, bonus/points/reward settings, campaigns, staff & locations, reconciliation and reports, refunds/adjustments with reason |
| Team console | Our team: support + developers | Create/configure clients, support lookups, monitoring, reconciliation alerts, billing to clients, audit log, feature flags, event/webhook inspector |

## Key behaviors
- **Top-up bonus:** e.g. load $50, get $55. Bonus funds are tracked separately from paid funds.
- **Points:** earned per dollar spent; redeemed for rewards from a client-defined catalog.
- **Balances never expire.**
- **Limits:** max balance per customer and max top-up per day, configurable per client.
- **QR:** generated on the customer's phone, rotates every ~60 seconds, works without the customer having internet (TOTP-style), single use.
- **Payment at the bar:** the client's POS still issues the fiscal invoice (factura). Our cashier app returns an authorization code the cashier types into the POS.
- **Cash top-ups:** cashier registers cash received and credits the wallet.
- **Receipts:** top-ups get a receipt from us (not a factura). ITBMS is charged by the client's POS when the customer consumes.

## Out of scope for now
- Balances usable across different clients (that would be e-money; not allowed in this model)
- Native iOS/Android apps
- Offline wallet approvals (maybe later as an opt-in "offline allowance")
