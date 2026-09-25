import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

/**
 * Plain SQL migrations live in supabase/migrations at the repo root, using the
 * Supabase CLI's `<timestamp>_<name>.sql` naming so the hosted project can
 * apply the very same files. This runner applies them to any PostgreSQL.
 */
export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations',
);

// Arbitrary constant; serialises concurrent migrators on one database.
const MIGRATION_LOCK_KEY = 7_420_001;

export interface MigrateOptions {
  dir?: string;
  log?: (message: string) => void;
}

/** Applies every pending migration in name order. Returns the names applied. */
export async function migrate(pool: Pool, options: MigrateOptions = {}): Promise<string[]> {
  const dir = options.dir ?? MIGRATIONS_DIR;
  const log = options.log ?? (() => {});
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      create table if not exists schema_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const done = new Set(
      (await client.query<{ name: string }>('select name from schema_migrations')).rows.map(
        (r) => r.name,
      ),
    );

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`migration ${file} failed: ${(error as Error).message}`, {
          cause: error,
        });
      }
      applied.push(file);
      log(`applied ${file}`);
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
  return applied;
}
