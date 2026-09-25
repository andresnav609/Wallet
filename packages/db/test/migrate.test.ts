import { readdir } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrate } from '../src/index';
import { createTestDatabase, type TestDatabase } from '../src/testing';

let db: TestDatabase;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db.close();
});

describe('migrations', () => {
  it('records every file and applies nothing on a second run', async () => {
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const recorded = await db.admin.query<{ name: string }>(
      'select name from schema_migrations order by name',
    );
    expect(recorded.rows.map((r) => r.name)).toEqual(files);

    const appliedAgain = await migrate(db.admin);
    expect(appliedAgain).toEqual([]);
  });

  it('created both application roles without superuser or bypassrls', async () => {
    const roles = await db.admin.query<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>(
      `select rolname, rolsuper, rolbypassrls from pg_roles
       where rolname in ('wallet_app', 'wallet_ledger') order by rolname`,
    );
    expect(roles.rows).toEqual([
      { rolname: 'wallet_app', rolsuper: false, rolbypassrls: false },
      { rolname: 'wallet_ledger', rolsuper: false, rolbypassrls: false },
    ]);
  });
});
