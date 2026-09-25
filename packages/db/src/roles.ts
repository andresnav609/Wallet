import type { Pool } from 'pg';

export const APP_ROLE = 'wallet_app';
export const LEDGER_ROLE = 'wallet_ledger';

export interface RolePasswords {
  app: string;
  ledger: string;
}

/**
 * Makes the two application roles able to log in with the given passwords.
 * Roles are cluster-wide, so this runs once per server, not per database.
 * Idempotent: safe to re-run; it only (re)sets the password.
 */
export async function ensureRoles(pool: Pool, passwords: RolePasswords): Promise<void> {
  const client = await pool.connect();
  try {
    for (const [role, password] of [
      [APP_ROLE, passwords.app],
      [LEDGER_ROLE, passwords.ledger],
    ] as const) {
      await client.query(`
        do $$
        begin
          if not exists (select 1 from pg_roles where rolname = '${role}') then
            create role ${role} nologin;
          end if;
        end
        $$
      `);
      // ALTER ROLE does not accept bind parameters; escape the literal instead.
      await client.query(
        `alter role ${role} with login password ${client.escapeLiteral(password)}`,
      );
    }
  } finally {
    client.release();
  }
}
