import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

export const dbEnabled = process.env.RUN_DB_TESTS === '1';
let container: StartedPostgreSqlContainer | null = null;
let pool: Pool | null = null;

export async function startDb(): Promise<{ url: string; pool: Pool }> {
  if (!container) container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  pool = new Pool({ connectionString: url });
  const migration = fs.readFileSync(path.join(process.cwd(), 'drizzle/0000_init.sql'), 'utf8');
  await pool.query(migration);
  return { url, pool };
}

export async function resetDb() {
  if (!pool) return;
  await pool.query('TRUNCATE entries, letter_locks');
}

export async function stopDb() {
  if (pool) await pool.end();
  if (container) await container.stop();
  pool = null;
  container = null;
}
