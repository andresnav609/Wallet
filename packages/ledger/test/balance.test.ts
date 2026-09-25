import { sqlState } from '@wallet/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InsufficientFundsError, SQLSTATE } from '../src/index';
import {
  accountIds,
  actor,
  asLedgerRole,
  rawEntry,
  rawTransaction,
  setupFixture,
  tenantAccountIds,
  type Fixture,
} from './helpers';

let f: Fixture;

beforeAll(async () => {
  f = await setupFixture();
});

afterAll(async () => {
  await f.db.close();
});

describe('balances never go negative', () => {
  it('refuses a charge above the available balance, with a clean error', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const base = { tenantId: f.tenantId, customerId: customer, actor };
    await f.ledger.topUp({ ...base, idempotencyKey: f.key('topup'), amountMinor: 1000 });

    await expect(
      f.ledger.charge({ ...base, idempotencyKey: f.key('charge'), amountMinor: 1001 }),
    ).rejects.toSatisfy(
      (e) => e instanceof InsufficientFundsError && e.available === 1000 && e.requested === 1001,
    );

    const balances = await f.ledger.getBalances(f.tenantId, customer);
    expect(balances.totalMinor).toBe(1000);
  });

  it('is enforced by the database even when the pre-check is bypassed', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    await f.ledger.topUp({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('topup'),
      amountMinor: 500,
    });
    const accounts = await accountIds(f, customer);
    const tenant = await tenantAccountIds(f);

    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'payment');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, -600);
        await rawEntry(client, f.tenantId, tx, tenant.sales_redeemed!, 600);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.CHECK_VIOLATION);

    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(500);
  });

  it('never overdraws under concurrent charges', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const base = { tenantId: f.tenantId, customerId: customer, actor };
    await f.ledger.topUp({ ...base, idempotencyKey: f.key('topup'), amountMinor: 5000 });

    // Five charges of 2000 against 5000: exactly two can succeed.
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        f.ledger.charge({ ...base, idempotencyKey: `race:${i}`, amountMinor: 2000 }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(2);
    expect(failed).toHaveLength(3);
    for (const r of failed) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientFundsError);
    }

    const balances = await f.ledger.getBalances(f.tenantId, customer);
    expect(balances.totalMinor).toBe(1000);
    expect(await f.ledger.verifyBalances(f.tenantId)).toEqual([]);
  });

  it('applies to points as well', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const base = { tenantId: f.tenantId, customerId: customer, actor };
    await f.ledger.topUp({ ...base, idempotencyKey: f.key('topup'), amountMinor: 1000 });
    await f.ledger.charge({
      ...base,
      idempotencyKey: f.key('charge'),
      amountMinor: 1000,
      pointsEarned: 10,
    });
    await expect(
      f.ledger.redeemPoints({ ...base, idempotencyKey: f.key('redeem'), points: 11 }),
    ).rejects.toSatisfy((e) => e instanceof InsufficientFundsError && e.unit === 'points');
    expect((await f.ledger.getBalances(f.tenantId, customer)).points).toBe(10);
  });

  it('returns zero balances for a customer with no activity', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    expect(await f.ledger.getBalances(f.tenantId, customer)).toEqual({
      customerId: customer,
      currency: 'USD',
      paidMinor: 0,
      bonusMinor: 0,
      totalMinor: 0,
      points: 0,
    });
  });
});

describe('cached balances are derived and verifiable', () => {
  it('reports no drift after normal activity', async () => {
    expect(await f.ledger.verifyBalances(f.tenantId)).toEqual([]);
  });

  it('detects a cache that no longer matches its entries', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    await f.ledger.topUp({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('topup'),
      amountMinor: 700,
    });
    const accounts = await accountIds(f, customer);
    // Only the owner can do this, and only by hand — which is the point.
    await f.db.admin.query('update ledger_balances set balance = balance + 1 where account_id = $1', [
      accounts.paid_funds,
    ]);
    expect(await f.ledger.verifyBalances(f.tenantId)).toEqual([
      { accountId: accounts.paid_funds, cached: 701, computed: 700 },
    ]);
  });
});
