import pg from 'pg';

export type { Pool, PoolClient, QueryResult } from 'pg';

// Money is stored as bigint minor units. pg returns int8 as a string by
// default; we convert to a JS number but refuse anything outside the safe
// integer range rather than silently losing precision.
pg.types.setTypeParser(20, (value: string) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`bigint value ${value} is outside the safe integer range`);
  }
  return n;
});

export interface PoolOptions {
  max?: number;
  applicationName?: string;
}

export function createPool(connectionString: string, options: PoolOptions = {}): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: options.max ?? 10,
    application_name: options.applicationName ?? 'wallet-platform',
  });
}

/**
 * Runs `fn` inside one database transaction scoped to a tenant.
 *
 * The tenant is set with a transaction-local `set_config`, which every
 * row-level-security policy reads through `app.current_tenant()`. Nothing
 * outside this transaction can see or touch the tenant's rows, and the setting
 * disappears at COMMIT/ROLLBACK, so a pooled connection never leaks a tenant
 * to the next caller.
 */
export async function withTenant<T>(
  pool: pg.Pool,
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await setTenant(client, tenantId);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // the connection is already broken; releasing it below discards it
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Sets the tenant for the current transaction on an already-open client. */
export async function setTenant(client: pg.PoolClient, tenantId: string): Promise<void> {
  await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
}

/**
 * Builds a connection string for another role on the same server/database.
 * Used to derive the wallet_app / wallet_ledger URLs from the admin URL in
 * local development and tests; production passes explicit URLs via env.
 */
export function connectionUrlForRole(
  baseUrl: string,
  role: string,
  password: string,
  database?: string,
): string {
  const url = new URL(baseUrl);
  url.username = role;
  url.password = password;
  if (database !== undefined) {
    url.pathname = `/${database}`;
  }
  return url.toString();
}
