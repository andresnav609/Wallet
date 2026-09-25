import { sqlState } from '@wallet/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SQLSTATE } from '../src/index';
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

describe('double-entry invariants', () => {
  it('every API write produces entries that sum to zero per unit', async () => {
    const base = { tenantId: f.tenantId, customerId: f.customerId, actor };
    await f.ledger.topUp({ ...base, idempotencyKey: f.key('topup'), amountMinor: 5000, bonusMinor: 500 });
    await f.ledger.cashTopUp({ ...base, idempotencyKey: f.key('cash'), amountMinor: 1000 });
    const payment = await f.ledger.charge({
      ...base,
      idempotencyKey: f.key('charge'),
      amountMinor: 1250,
      pointsEarned: 12,
    });
    await f.ledger.redeemPoints({ ...base, idempotencyKey: f.key('redeem'), points: 5 });
    await f.ledger.void({
      tenantId: f.tenantId,
      idempotencyKey: f.key('void'),
      actor,
      transactionId: payment.transaction.id,
      reason: 'test',
    });
    await f.ledger.adjust({
      ...base,
      idempotencyKey: f.key('adjust'),
      account: 'paid_funds',
      amount: -100,
      reason: 'test',
    });

    const unbalanced = await f.db.admin.query(
      `select transaction_id, unit, sum(amount) as total
       from ledger_entries where tenant_id = $1
       group by transaction_id, unit having sum(amount) <> 0`,
      [f.tenantId],
    );
    expect(unbalanced.rows).toEqual([]);

    const tooFew = await f.db.admin.query(
      `select t.id from ledger_transactions t
       left join ledger_entries e on e.transaction_id = t.id
       where t.tenant_id = $1 group by t.id having count(e.id) < 2`,
      [f.tenantId],
    );
    expect(tooFew.rows).toEqual([]);
    expect(await f.ledger.verifyBalances(f.tenantId)).toEqual([]);
  });

  it('rejects an unbalanced transaction at commit', async () => {
    const accounts = await accountIds(f);
    const tenant = await tenantAccountIds(f);
    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 100);
        await rawEntry(client, f.tenantId, tx, tenant.topups_received!, -50);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.UNBALANCED);
  });

  it('rejects a transaction with a single entry', async () => {
    const accounts = await accountIds(f);
    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 100);
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, -100);
        // balanced, but both on one account: allowed. Now the real case:
      }),
    ).resolves.toBeUndefined();

    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 100);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.UNBALANCED);
  });

  it('rejects a transaction that mixes currencies even when each side balances', async () => {
    const accounts = await accountIds(f);
    const { rows } = await f.db.admin.query<{ id: string }>(
      `insert into ledger_accounts (tenant_id, owner_type, code, unit, currency)
       values ($1, 'tenant', 'legacy_pab', 'money', 'PAB') returning id`,
      [f.tenantId],
    );
    const pabAccount = rows[0]!.id;

    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 100);
        await rawEntry(client, f.tenantId, tx, pabAccount, -100);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.MIXED_CURRENCIES);
  });

  it('rejects an entry whose currency or unit differs from its account', async () => {
    const accounts = await accountIds(f);
    const tenant = await tenantAccountIds(f);
    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.paid_funds!, 100, { currency: 'PAB' });
        await rawEntry(client, f.tenantId, tx, tenant.topups_received!, -100);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.UNIT_MISMATCH);

    await expect(
      asLedgerRole(f, async (client) => {
        const tx = await rawTransaction(client, f.tenantId, 'top_up');
        await rawEntry(client, f.tenantId, tx, accounts.points!, 100, { unit: 'money' });
        await rawEntry(client, f.tenantId, tx, tenant.topups_received!, -100);
      }),
    ).rejects.toSatisfy((e) => sqlState(e) === SQLSTATE.UNIT_MISMATCH);
  });

  it('rejects a top-up in a currency other than the tenant currency', async () => {
    await expect(
      f.ledger.topUp({
        tenantId: f.tenantId,
        customerId: f.customerId,
        actor,
        idempotencyKey: f.key('pab'),
        amountMinor: 100,
        currency: 'PAB',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('rejects zero and non-integer amounts before touching the database', async () => {
    const base = { tenantId: f.tenantId, customerId: f.customerId, actor };
    await expect(
      f.ledger.charge({ ...base, idempotencyKey: f.key('zero'), amountMinor: 0 }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      f.ledger.topUp({ ...base, idempotencyKey: f.key('float'), amountMinor: 10.5 }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
