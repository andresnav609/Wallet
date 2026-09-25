// "No code path outside packages/ledger can write money movements."
// Proven two ways: database privileges (the app role can not, and nobody can
// mutate what exists), and a source scan (no other workspace even names the
// ledger tables).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTenant } from '@wallet/db';
import { sqlState } from '@wallet/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SQLSTATE } from '../src/index';
import { accountIds, actor, setupFixture, type Fixture } from './helpers';

let f: Fixture;
let paymentId: string;

beforeAll(async () => {
  f = await setupFixture();
  await f.ledger.topUp({
    tenantId: f.tenantId,
    customerId: f.customerId,
    actor,
    idempotencyKey: 'seed-topup',
    amountMinor: 1000,
  });
  paymentId = (
    await f.ledger.charge({
      tenantId: f.tenantId,
      customerId: f.customerId,
      actor,
      idempotencyKey: 'seed-charge',
      amountMinor: 100,
    })
  ).transaction.id;
});

afterAll(async () => {
  await f.db.close();
});

const denied = (e: unknown): boolean => sqlState(e) === SQLSTATE.INSUFFICIENT_PRIVILEGE;
const immutable = (e: unknown): boolean => sqlState(e) === SQLSTATE.IMMUTABLE;

describe('database privileges', () => {
  it('the app role can not insert ledger rows', async () => {
    const accounts = await accountIds(f);
    await expect(
      withTenant(f.db.app, f.tenantId, (c) =>
        c.query(
          `insert into ledger_transactions (tenant_id, type, idempotency_key, request_hash, actor_type, actor_id)
           values ($1, 'top_up', 'app-attempt', 'x', 'system', 'app')`,
          [f.tenantId],
        ),
      ),
    ).rejects.toSatisfy(denied);
    await expect(
      withTenant(f.db.app, f.tenantId, (c) =>
        c.query(
          `insert into ledger_entries (tenant_id, transaction_id, account_id, unit, currency, amount)
           values ($1, $2, $3, 'money', 'USD', 100)`,
          [f.tenantId, paymentId, accounts.paid_funds],
        ),
      ),
    ).rejects.toSatisfy(denied);
    await expect(
      withTenant(f.db.app, f.tenantId, (c) =>
        c.query(
          `insert into ledger_accounts (tenant_id, owner_type, code, unit, currency)
           values ($1, 'tenant', 'sneaky', 'money', 'USD')`,
          [f.tenantId],
        ),
      ),
    ).rejects.toSatisfy(denied);
  });

  it('neither role can update or delete ledger rows', async () => {
    for (const pool of [f.db.app, f.db.ledger]) {
      await expect(
        withTenant(pool, f.tenantId, (c) =>
          c.query('update ledger_entries set amount = amount + 1 where transaction_id = $1', [
            paymentId,
          ]),
        ),
      ).rejects.toSatisfy(denied);
      await expect(
        withTenant(pool, f.tenantId, (c) =>
          c.query('delete from ledger_transactions where id = $1', [paymentId]),
        ),
      ).rejects.toSatisfy(denied);
      await expect(
        withTenant(pool, f.tenantId, (c) =>
          c.query('update ledger_balances set balance = 0 where tenant_id = $1', [f.tenantId]),
        ),
      ).rejects.toSatisfy(denied);
    }
  });

  it('even the owner can not update or delete ledger rows', async () => {
    await expect(
      f.db.admin.query('update ledger_entries set amount = amount + 1 where transaction_id = $1', [
        paymentId,
      ]),
    ).rejects.toSatisfy(immutable);
    await expect(
      f.db.admin.query('delete from ledger_entries where transaction_id = $1', [paymentId]),
    ).rejects.toSatisfy(immutable);
    await expect(
      f.db.admin.query(`update ledger_transactions set reason = 'edited' where id = $1`, [
        paymentId,
      ]),
    ).rejects.toSatisfy(immutable);
    await expect(
      f.db.admin.query('delete from ledger_transactions where id = $1', [paymentId]),
    ).rejects.toSatisfy(immutable);
    await expect(
      f.db.admin.query(`update ledger_accounts set code = 'renamed' where tenant_id = $1`, [
        f.tenantId,
      ]),
    ).rejects.toSatisfy(immutable);
    // Row triggers only fire on matched rows: make sure an audit row exists.
    await f.ledger.adjust({
      tenantId: f.tenantId,
      customerId: f.customerId,
      actor,
      idempotencyKey: 'audit-row',
      account: 'paid_funds',
      amount: 1,
      reason: 'create an audit row',
    });
    await expect(
      f.db.admin.query('delete from audit_log where tenant_id = $1', [f.tenantId]),
    ).rejects.toSatisfy(immutable);
  });

  it('the ledger role can not touch tables it has no business with', async () => {
    await expect(
      withTenant(f.db.ledger, f.tenantId, (c) =>
        c.query(`update tenants set spend_order = 'paid_first' where id = $1`, [f.tenantId]),
      ),
    ).rejects.toSatisfy(denied);
  });
});

describe('source boundary', () => {
  const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const SCAN_ROOTS = ['apps', 'packages', 'scripts'];
  const ALLOWED_PREFIX = path.join('packages', 'ledger') + path.sep;
  const TABLE_NAMES = /\bledger_(entries|transactions|balances|accounts)\b/;

  async function sourceFiles(dir: string): Promise<string[]> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'test' || entry.name.startsWith('.')) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await sourceFiles(full)));
      else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(full);
    }
    return files;
  }

  it('no workspace outside packages/ledger references the ledger tables', async () => {
    const offenders: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const file of await sourceFiles(path.join(REPO_ROOT, root))) {
        const relative = path.relative(REPO_ROOT, file);
        if (relative.startsWith(ALLOWED_PREFIX)) continue;
        if (TABLE_NAMES.test(await readFile(file, 'utf8'))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});
