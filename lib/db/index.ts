import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pool?: Pool };

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return globalForDb.pool;
}

export function db() {
  return drizzle(getPool(), { schema });
}

export { schema };
