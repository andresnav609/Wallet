// pnpm db:setup   -> ensure roles (passwords from env) + apply migrations
// pnpm db:migrate -> apply migrations only
import { createPool } from './client';
import { loadEnv, requireEnv } from './env';
import { migrate } from './migrate';
import { ensureRoles } from './roles';

async function main(): Promise<void> {
  loadEnv();
  const command = process.argv[2] ?? 'migrate';
  const pool = createPool(requireEnv('DATABASE_ADMIN_URL'), { max: 1 });
  try {
    if (command === 'setup') {
      await ensureRoles(pool, {
        app: requireEnv('WALLET_APP_PASSWORD'),
        ledger: requireEnv('WALLET_LEDGER_PASSWORD'),
      });
      console.log('roles ready: wallet_app, wallet_ledger');
    } else if (command !== 'migrate') {
      throw new Error(`unknown command "${command}" (expected: setup | migrate)`);
    }
    const applied = await migrate(pool, { log: console.log });
    console.log(
      applied.length === 0
        ? 'migrations: nothing to apply'
        : `migrations: applied ${applied.length}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
