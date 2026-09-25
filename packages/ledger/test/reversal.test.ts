import { sqlState } from '@wallet/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AlreadyReversedError,
  InsufficientFundsError,
  NotReversibleError,
  SQLSTATE,
  type LedgerTransaction,
} from '../src/index';
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

async function fundedCustomer(amountMinor: number, bonusMinor = 0): Promise<string> {
  const customer = (await f.db.createCustomer(f.tenantId)).id;
  await f.ledger.topUp({
    tenantId: f.tenantId,
    customerId: customer,
    actor,
    idempotencyKey: f.key('fund'),
    amountMinor,
    bonusMinor,
  });
  return customer;
}

function mirrored(original: LedgerTransaction, reversal: LedgerTransaction): boolean {
  const key = (accountId: string, amount: number): string => `${accountId}:${amount}`;
  const expected = new Set(original.entries.map((e) => key(e.accountId, -e.amount)));
  const actual = new Set(reversal.entries.map((e) => key(e.accountId, e.amount)));
  return expected.size === actual.size && [...expected].every((k) => actual.has(k));
}

describe('void and refund', () => {
  it('restores balances exactly and leaves the original untouched', async () => {
    const customer = await fundedCustomer(5000, 500);
    const before = await f.ledger.getBalances(f.tenantId, customer);
    const payment = await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 1200,
      pointsEarned: 12,
    });
    expect(await f.ledger.getBalances(f.tenantId, customer)).toMatchObject({
      totalMinor: 4300,
      points: 12,
    });

    const voided = await f.ledger.void({
      tenantId: f.tenantId,
      idempotencyKey: f.key('void'),
      actor: { type: 'cashier', id: 'c1' },
      transactionId: payment.transaction.id,
      reason: 'customer changed their mind',
    });

    expect(voided.transaction.type).toBe('void');
    expect(voided.transaction.reversesTransactionId).toBe(payment.transaction.id);
    expect(mirrored(payment.transaction, voided.transaction)).toBe(true);
    expect(await f.ledger.getBalances(f.tenantId, customer)).toEqual(before);

    const original = await f.ledger.getTransaction(f.tenantId, payment.transaction.id);
    expect(original).toEqual(payment.transaction);
    expect(await f.ledger.verifyBalances(f.tenantId)).toEqual([]);
  });

  it('records the reversal in the audit log', async () => {
    const { rows } = await f.db.admin.query(
      `select actor_type, actor_id, action from audit_log
       where tenant_id = $1 and action = 'ledger.void'`,
      [f.tenantId],
    );
    expect(rows).toEqual([{ actor_type: 'cashier', actor_id: 'c1', action: 'ledger.void' }]);
  });

  it('allows exactly one reversal per transaction', async () => {
    const customer = await fundedCustomer(1000);
    const payment = await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 400,
    });
    const first = await f.ledger.refund({
      tenantId: f.tenantId,
      idempotencyKey: 'refund-A',
      actor,
      transactionId: payment.transaction.id,
      reason: 'wrong item',
    });
    const again = await f.ledger.refund({
      tenantId: f.tenantId,
      idempotencyKey: 'refund-A',
      actor,
      transactionId: payment.transaction.id,
      reason: 'wrong item',
    });
    expect(again.replayed).toBe(true);
    expect(again.transaction.id).toBe(first.transaction.id);

    await expect(
      f.ledger.void({
        tenantId: f.tenantId,
        idempotencyKey: 'void-B',
        actor,
        transactionId: payment.transaction.id,
        reason: 'second attempt',
      }),
    ).rejects.toBeInstanceOf(AlreadyReversedError);
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(1000);
  });

  it('lets only one of two concurrent reversals win', async () => {
    const customer = await fundedCustomer(1000);
    const payment = await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 300,
    });
    const results = await Promise.allSettled(
      ['x', 'y', 'z'].map((k) =>
        f.ledger.void({
          tenantId: f.tenantId,
          idempotencyKey: `concurrent-void-${k}`,
          actor,
          transactionId: payment.transaction.id,
          reason: 'race',
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results.filter((r) => r.status === 'rejected')) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(AlreadyReversedError);
    }
    expect((await f.ledger.getBalances(f.tenantId, customer)).paidMinor).toBe(1000);
  });

  it('refuses to reverse a reversal', async () => {
    const customer = await fundedCustomer(1000);
    const payment = await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 100,
    });
    const voided = await f.ledger.void({
      tenantId: f.tenantId,
      idempotencyKey: f.key('void'),
      actor,
      transactionId: payment.transaction.id,
      reason: 'test',
    });
    await expect(
      f.ledger.void({
        tenantId: f.tenantId,
        idempotencyKey: f.key('void'),
        actor,
        transactionId: voided.transaction.id,
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(NotReversibleError);
  });

  it('refuses to refund a top-up the customer has already spent', async () => {
    const customer = (await f.db.createCustomer(f.tenantId)).id;
    const topUp = await f.ledger.topUp({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('topup'),
      amountMinor: 1000,
    });
    await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 700,
    });
    await expect(
      f.ledger.refund({
        tenantId: f.tenantId,
        idempotencyKey: f.key('refund'),
        actor,
        transactionId: topUp.transaction.id,
        reason: 'chargeback',
      }),
    ).rejects.toSatisfy(
      (e) => e instanceof InsufficientFundsError && e.available === 300 && e.requested === 1000,
    );
  });

  it('requires a reason', async () => {
    await expect(
      f.ledger.void({
        tenantId: f.tenantId,
        idempotencyKey: f.key('void'),
        actor,
        transactionId: '00000000-0000-0000-0000-000000000000',
        reason: '  ',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('is rejected by the database when the reversal is not exact', async () => {
    const customer = await fundedCustomer(1000);
    const payment = await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: customer,
      actor,
      idempotencyKey: f.key('charge'),
      amountMinor: 250,
    });
    const accounts = await accountIds(f, customer);
    const tenant = await tenantAccountIds(f);

    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'void', {
          reverses: payment.transaction.id,
        });
        // Balanced, but 200 instead of the original 250.
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 200);
        await rawEntry(client, f.tenantId, tx, tenant.sales_redeemed!, -200);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.INEXACT_REVERSAL);
  });
});
