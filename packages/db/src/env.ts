import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Loads the repo-root `.env` if present (local development). Existing
 * environment variables win, so CI and production are unaffected.
 */
export function loadEnv(): void {
  const file = path.join(REPO_ROOT, '.env');
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`missing required environment variable ${name}`);
  }
  return value;
}
