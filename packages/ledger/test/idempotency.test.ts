import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdempotencyConflictError } from '../src/index';
import { actor, setupFixture, type Fixture } from './helpers';

let f: Fixture;

beforeAll(async () => {
  f = await setupFixture();
});

afterAll(async () => {
  await f.db.close();
});

async function transactionCount(tenantId: string, key: string): Promise<number> {
  const { rows } = await f.db.admin.query<{ n: number }>(
    'select count(*)::int as n from ledger_transactions where tenant_id = $1 and idempotency_key = $2',
    [tenantId, key],
  );
  return rows[0]!.n;
}

describe('idempotency', () => {
  it('returns the same transaction for a repeated key and credits only once', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const input = {
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: 'webhook:evt_001',
      amountMinor: 2500,
    };
    const first = await f.ledger.topUp(input);
    const second = await f.ledger.topUp(input);

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(await transactionCount(f.tenantId, input.idempotencyKey)).toBe(1);
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(2500);
  });

  it('creates one transaction when identical requests arrive at the same time', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const input = {
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: 'webhook:evt_002',
      amountMinor: 1000,
    };
    const results = await Promise.all(Array.from({ length: 8 }, () => f.ledger.topUp(input)));
    const ids = new Set(results.map((r) => r.transaction.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await transactionCount(f.tenantId, input.idempotencyKey)).toBe(1);
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(1000);
  });

  it('applies to charges from the cashier too', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const base = { tenantId: f.tenantId, customerId: customer, actor };
    await f.ledger.topUp({ ...base, idempotencyKey: f.key('topup'), amountMinor: 3000 });
    const charge = { ...base, idempotencyKey: 'cashier:req_9', amountMinor: 1200 };
    const results = await Promise.all(Array.from({ length: 4 }, () => f.ledger.charge(charge)));
    expect(new Set(results.map((r) => r.transaction.id)).size).toBe(1);
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(1800);
  });

  it('refuses a reused key with a different request', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const base = { tenantId: f.tenantId, customerId: customer, actor, idempotencyKey: 'evt_003' };
    await f.ledger.topUp({ ...base, amountMinor: 100 });
    await expect(f.ledger.topUp({ ...base, amountMinor: 200 })).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
    await expect(f.ledger.charge({ ...base, amountMinor: 100 })).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(100);
  });

  it('replays a top-up with bonus as both transactions', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const input = {
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: 'evt_004',
      amountMinor: 5000,
      bonusMinor: 500,
    };
    const first = await f.ledger.topUp(input);
    const second = await f.ledger.topUp(input);
    expect(first.bonusTransaction?.type).toBe('bonus_credit');
    expect(second.bonusTransaction?.id).toBe(first.bonusTransaction?.id);
    const balances = await f.ledger.getBalances(f.tenantId, customer);
    expect(balances).toMatchObject({ paidMinor: 5000, bonusMinor: 500, totalMinor: 5500 });
  });

  it('scopes keys per tenant', async () => {
    const other = await f.db.createTenant({ slug: 'other' });
    const otherCustomer = (await f.db.createCustomer(other.id)).id;
    const a = await f.ledger.topUp({
      tenantId: f.tenantId,
      customerId: f.customerId,
      actor,
      idempotencyKey: 'shared-key',
      amountMinor: 100,
    });
    const b = await f.ledger.topUp({
      tenantId: other.id,
      customerId: otherCustomer,
      actor,
      idempotencyKey: 'shared-key',
      amountMinor: 100,
    });
    expect(a.transaction.id).not.toBe(b.transaction.id);
    expect(b.replayed).toBe(false);
  });
});
