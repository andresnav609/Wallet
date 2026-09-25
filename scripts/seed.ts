// Seeds the "Demo Club" tenant with realistic activity for sales demos.
// Idempotent: every ledger write uses a fixed idempotency key, so re-running
// changes nothing. Run with `pnpm db:seed` after `pnpm db:setup`.
import { LEDGER_ROLE, connectionUrlForRole, createPool, loadEnv, requireEnv } from '@wallet/db';
import { createLedger, type Actor } from '@wallet/ledger';

const DEMO = {
  slug: 'demo',
  name: 'Demo Club',
  currency: 'USD',
  spendOrder: 'bonus_first',
  customers: [
    { phone: '+50760001001', name: 'Ana Pérez' },
    { phone: '+50760001002', name: 'Luis Gómez' },
    { phone: '+50760001003', name: 'María Castillo' },
  ],
} as const;

const system: Actor = { type: 'system', id: 'seed' };
const cashier: Actor = { type: 'cashier', id: 'demo-cashier-1' };

async function main(): Promise<void> {
  loadEnv();
  const adminUrl = requireEnv('DATABASE_ADMIN_URL');
  const admin = createPool(adminUrl, { max: 2, applicationName: 'seed-admin' });
  const ledgerPool = createPool(
    connectionUrlForRole(adminUrl, LEDGER_ROLE, requireEnv('WALLET_LEDGER_PASSWORD')),
    { max: 2, applicationName: 'seed-ledger' },
  );
  const ledger = createLedger({ pool: ledgerPool });

  try {
    const tenant = (
      await admin.query<{ id: string }>(
        `insert into tenants (slug, name, currency, spend_order)
         values ($1, $2, $3, $4)
         on conflict (slug) do update set name = excluded.name
         returning id`,
        [DEMO.slug, DEMO.name, DEMO.currency, DEMO.spendOrder],
      )
    ).rows[0]!;
    await ledger.ensureTenantAccounts(tenant.id);

    const customers: { id: string; phone: string; name: string }[] = [];
    for (const c of DEMO.customers) {
      const row = (
        await admin.query<{ id: string }>(
          `insert into customers (tenant_id, phone, display_name)
           values ($1, $2, $3)
           on conflict (tenant_id, phone) do update set display_name = excluded.display_name
           returning id`,
          [tenant.id, c.phone, c.name],
        )
      ).rows[0]!;
      customers.push({ id: row.id, ...c });
    }

    for (const [i, c] of customers.entries()) {
      const base = { tenantId: tenant.id, customerId: c.id };
      // Load $50, get $55: bonus tracked separately from paid funds.
      await ledger.topUp({
        ...base,
        actor: { type: 'webhook', id: 'mock-payments' },
        idempotencyKey: `seed:${c.phone}:topup:1`,
        amountMinor: 5000,
        bonusMinor: 500,
        metadata: { provider: 'mock', reference: `MOCK-${1000 + i}` },
      });
      await ledger.charge({
        ...base,
        actor: cashier,
        idempotencyKey: `seed:${c.phone}:charge:1`,
        amountMinor: 1275,
        pointsEarned: 12,
        metadata: { location: 'Casco Viejo', authorizationCode: `A${7000 + i}` },
      });
      await ledger.charge({
        ...base,
        actor: cashier,
        idempotencyKey: `seed:${c.phone}:charge:2`,
        amountMinor: 850,
        pointsEarned: 8,
        metadata: { location: 'Costa del Este', authorizationCode: `A${7100 + i}` },
      });
    }

    // One cash top-up and one voided charge, so reports have something to show.
    const first = customers[0]!;
    await ledger.cashTopUp({
      tenantId: tenant.id,
      customerId: first.id,
      actor: cashier,
      idempotencyKey: `seed:${first.phone}:cash:1`,
      amountMinor: 2000,
    });
    const mistaken = await ledger.charge({
      tenantId: tenant.id,
      customerId: first.id,
      actor: cashier,
      idempotencyKey: `seed:${first.phone}:charge:3`,
      amountMinor: 3000,
    });
    await ledger.void({
      tenantId: tenant.id,
      idempotencyKey: `seed:${first.phone}:void:1`,
      actor: cashier,
      transactionId: mistaken.transaction.id,
      reason: 'wrong table',
    });

    for (const c of customers) {
      const b = await ledger.getBalances(tenant.id, c.id);
      console.log(
        `${c.name.padEnd(16)} paid ${(b.paidMinor / 100).toFixed(2)}  bonus ${(b.bonusMinor / 100).toFixed(2)}  points ${b.points}`,
      );
    }
    const drift = await ledger.verifyBalances(tenant.id);
    console.log(drift.length === 0 ? 'balances verified' : `DRIFT: ${JSON.stringify(drift)}`);
    console.log(`Demo Club tenant id: ${tenant.id}`);
  } finally {
    await Promise.all([admin.end(), ledgerPool.end()]);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
