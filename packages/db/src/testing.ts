// Test helpers: one throwaway database per test file, cloned from a template
// that has every migration applied. Imported as `@wallet/db/testing`.
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Pool } from 'pg';
import { connectionUrlForRole, createPool } from './client';
import { loadEnv, requireEnv } from './env';
import { migrate } from './migrate';
import { APP_ROLE, LEDGER_ROLE, ensureRoles } from './roles';

export const TEMPLATE_DB = 'wallet_test_template';

export interface TestEnv {
  adminUrl: string;
  appPassword: string;
  ledgerPassword: string;
}

export function testEnv(): TestEnv {
  loadEnv();
  return {
    adminUrl: requireEnv('DATABASE_ADMIN_URL'),
    appPassword: requireEnv('WALLET_APP_PASSWORD'),
    ledgerPassword: requireEnv('WALLET_LEDGER_PASSWORD'),
  };
}

function connectionUrlForDatabase(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/** Global setup: (re)creates the template database with all migrations applied. */
export async function prepareTestTemplate(): Promise<void> {
  const env = testEnv();
  const maintenance = createPool(env.adminUrl, { max: 1 });
  try {
    await ensureRoles(maintenance, { app: env.appPassword, ledger: env.ledgerPassword });
    await maintenance.query(`drop database if exists ${TEMPLATE_DB} with (force)`);
    await maintenance.query(`create database ${TEMPLATE_DB}`);
  } finally {
    await maintenance.end();
  }
  const template = createPool(connectionUrlForDatabase(env.adminUrl, TEMPLATE_DB), { max: 1 });
  try {
    await migrate(template);
  } finally {
    await template.end();
  }
}

export interface TenantInput {
  slug?: string;
  name?: string;
  currency?: string;
  spendOrder?: 'bonus_first' | 'paid_first';
}

export interface TenantRow {
  id: string;
  slug: string;
  currency: string;
  spendOrder: 'bonus_first' | 'paid_first';
}

export interface TestDatabase {
  name: string;
  /** Owner connection: bypasses RLS. Only for fixtures and assertions. */
  admin: Pool;
  /** What the apps get: RLS-bound, read-only on the ledger. */
  app: Pool;
  /** What packages/ledger gets: RLS-bound, the only money writer. */
  ledger: Pool;
  adminUrl: string;
  appUrl: string;
  ledgerUrl: string;
  createTenant(input?: TenantInput): Promise<TenantRow>;
  createCustomer(tenantId: string, phone?: string): Promise<{ id: string }>;
  /** Ends every pool and drops the database. */
  close(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const env = testEnv();
  const name = `wallet_test_${randomBytes(6).toString('hex')}`;

  const maintenance = createPool(env.adminUrl, { max: 1 });
  try {
    // Parallel test files clone the template at the same time; PostgreSQL can
    // briefly refuse while another clone holds it, so retry a few times.
    for (let attempt = 1; ; attempt++) {
      try {
        await maintenance.query(`create database ${name} template ${TEMPLATE_DB}`);
        break;
      } catch (error) {
        if (attempt >= 5) throw error;
        await sleep(200 * attempt);
      }
    }
  } finally {
    await maintenance.end();
  }

  const adminUrl = connectionUrlForDatabase(env.adminUrl, name);
  const appUrl = connectionUrlForRole(adminUrl, APP_ROLE, env.appPassword);
  const ledgerUrl = connectionUrlForRole(adminUrl, LEDGER_ROLE, env.ledgerPassword);
  const admin = createPool(adminUrl, { max: 4, applicationName: 'test-admin' });
  const app = createPool(appUrl, { max: 4, applicationName: 'test-app' });
  const ledger = createPool(ledgerUrl, { max: 8, applicationName: 'test-ledger' });

  let tenantCounter = 0;
  let customerCounter = 0;

  return {
    name,
    admin,
    app,
    ledger,
    adminUrl,
    appUrl,
    ledgerUrl,

    async createTenant(input = {}) {
      tenantCounter += 1;
      const slug = input.slug ?? `tenant-${tenantCounter}`;
      const { rows } = await admin.query<{
        id: string;
        slug: string;
        currency: string;
        spend_order: 'bonus_first' | 'paid_first';
      }>(
        `insert into tenants (slug, name, currency, spend_order)
         values ($1, $2, $3, $4)
         returning id, slug, currency, spend_order`,
        [slug, input.name ?? slug, input.currency ?? 'USD', input.spendOrder ?? 'bonus_first'],
      );
      const row = rows[0]!;
      return { id: row.id, slug: row.slug, currency: row.currency, spendOrder: row.spend_order };
    },

    async createCustomer(tenantId, phone) {
      customerCounter += 1;
      const { rows } = await admin.query<{ id: string }>(
        `insert into customers (tenant_id, phone) values ($1, $2) returning id`,
        [tenantId, phone ?? `+507600${String(customerCounter).padStart(4, '0')}`],
      );
      return { id: rows[0]!.id };
    },

    async close() {
      await Promise.all([admin.end(), app.end(), ledger.end()]);
      const cleanup = createPool(env.adminUrl, { max: 1 });
      try {
        await cleanup.query(`drop database if exists ${name} with (force)`);
      } finally {
        await cleanup.end();
      }
    },
  };
}

/** The SQLSTATE of a pg error, or undefined for any other error. */
export function sqlState(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}
