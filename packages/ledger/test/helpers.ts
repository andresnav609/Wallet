import { withTenant, type PoolClient } from '@wallet/db';
import { createTestDatabase, type TestDatabase } from '@wallet/db/testing';
import { createLedger, type Actor, type Ledger, type SpendOrder } from '../src/index';

export const actor: Actor = { type: 'system', id: 'test' };

export interface Fixture {
  db: TestDatabase;
  ledger: Ledger;
  tenantId: string;
  customerId: string;
  currency: string;
  /** Unique idempotency key for one test step. */
  key(step: string): string;
}

export async function setupFixture(options: { spendOrder?: SpendOrder } = {}): Promise<Fixture> {
  const db = await createTestDatabase();
  const tenant = await db.createTenant({
    slug: 'test',
    currency: 'USD',
    ...(options.spendOrder ? { spendOrder: options.spendOrder } : {}),
  });
  const customer = await db.createCustomer(tenant.id);
  let n = 0;
  return {
    db,
    ledger: createLedger({ pool: db.ledger }),
    tenantId: tenant.id,
    customerId: customer.id,
    currency: tenant.currency,
    key: (step) => `${step}:${++n}`,
  };
}

/** Runs raw SQL as the wallet_ledger role inside a tenant transaction. */
export function asLedgerRole<T>(
  f: Fixture,
  fn: (client: PoolClient) => Promise<T>,
  tenantId: string = f.tenantId,
): Promise<T> {
  return withTenant(f.db.ledger, tenantId, fn);
}

/** Account ids of a customer, keyed by code. Reads as the owner. */
export async function accountIds(
  f: Fixture,
  customerId: string = f.customerId,
): Promise<Record<string, string>> {
  await f.ledger.ensureCustomerAccounts(f.tenantId, customerId);
  const { rows } = await f.db.admin.query<{ code: string; id: string }>(
    'select code, id from ledger_accounts where tenant_id = $1 and customer_id = $2',
    [f.tenantId, customerId],
  );
  return Object.fromEntries(rows.map((r) => [r.code, r.id]));
}

/** Tenant-level account ids keyed by code. */
export async function tenantAccountIds(f: Fixture): Promise<Record<string, string>> {
  await f.ledger.ensureTenantAccounts(f.tenantId);
  const { rows } = await f.db.admin.query<{ code: string; id: string }>(
    `select code, id from ledger_accounts where tenant_id = $1 and owner_type = 'tenant'`,
    [f.tenantId],
  );
  return Object.fromEntries(rows.map((r) => [r.code, r.id]));
}

/** Inserts a bare transaction row (no entries) as the ledger role. */
export async function rawTransaction(
  client: PoolClient,
  tenantId: string,
  type: string,
  extra: { reverses?: string; key?: string } = {},
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into ledger_transactions
       (tenant_id, type, idempotency_key, request_hash, reverses_transaction_id, actor_type, actor_id)
     values ($1, $2::ledger_transaction_type, $3, 'raw', $4, 'system', 'raw-test')
     returning id`,
    [tenantId, type, extra.key ?? `raw:${Math.random()}`, extra.reverses ?? null],
  );
  return rows[0]!.id;
}

export async function rawEntry(
  client: PoolClient,
  tenantId: string,
  transactionId: string,
  accountId: string,
  amount: number,
  override: { unit?: string; currency?: string | null } = {},
): Promise<void> {
  await client.query(
    `insert into ledger_entries (tenant_id, transaction_id, account_id, unit, currency, amount)
     select $1, $2, $3, coalesce($4, a.unit), case when $6 then $5 else a.currency end, $7
     from ledger_accounts a where a.id = $3`,
    [
      tenantId,
      transactionId,
      accountId,
      override.unit ?? null,
      override.currency ?? null,
      'currency' in override,
      amount,
    ],
  );
}
