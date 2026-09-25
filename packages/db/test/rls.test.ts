import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTenant } from '../src/index';
import { createTestDatabase, sqlState, type TestDatabase } from '../src/testing';

let db: TestDatabase;
let tenantA: string;
let tenantB: string;

beforeAll(async () => {
  db = await createTestDatabase();
  tenantA = (await db.createTenant({ slug: 'a' })).id;
  tenantB = (await db.createTenant({ slug: 'b' })).id;
  await db.createCustomer(tenantA, '+50760000001');
  await db.createCustomer(tenantA, '+50760000002');
  await db.createCustomer(tenantB, '+50760000003');
});

afterAll(async () => {
  await db.close();
});

describe('row-level security', () => {
  it('shows a tenant only its own rows', async () => {
    const a = await withTenant(db.app, tenantA, (c) => c.query('select phone from customers'));
    const b = await withTenant(db.app, tenantB, (c) => c.query('select phone from customers'));
    expect(a.rowCount).toBe(2);
    expect(b.rowCount).toBe(1);

    const tenants = await withTenant(db.app, tenantA, (c) => c.query('select slug from tenants'));
    expect(tenants.rows).toEqual([{ slug: 'a' }]);
  });

  it('shows nothing when no tenant is set on the connection', async () => {
    const customers = await db.app.query('select 1 from customers');
    const tenants = await db.app.query('select 1 from tenants');
    expect(customers.rowCount).toBe(0);
    expect(tenants.rowCount).toBe(0);
  });

  it('refuses to insert a row for another tenant', async () => {
    await expect(
      withTenant(db.app, tenantA, (c) =>
        c.query('insert into customers (tenant_id, phone) values ($1, $2)', [
          tenantB,
          '+50760000099',
        ]),
      ),
    ).rejects.toSatisfy((e) => sqlState(e) === '42501');
  });

  it('does not leak the tenant setting to the next user of a pooled connection', async () => {
    // Force a single connection so the second query reuses the first one's.
    const { createPool } = await import('../src/index');
    const single = createPool(db.appUrl, { max: 1 });
    try {
      await withTenant(single, tenantA, (c) => c.query('select 1 from customers'));
      const after = await single.query('select 1 from customers');
      expect(after.rowCount).toBe(0);
    } finally {
      await single.end();
    }
  });

  it('applies to the ledger role too', async () => {
    await withTenant(db.ledger, tenantB, (c) =>
      c.query(
        `insert into ledger_accounts (tenant_id, owner_type, code, unit, currency)
         values ($1, 'tenant', 'topups_received', 'money', 'USD')`,
        [tenantB],
      ),
    );
    const seenFromA = await withTenant(db.ledger, tenantA, (c) =>
      c.query('select 1 from ledger_accounts'),
    );
    expect(seenFromA.rowCount).toBe(0);
  });
});
