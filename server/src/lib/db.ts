import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '../env.js';
import * as schema from '../db/schema/index.js';

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function createPool() {
  const env = getEnv();

  return new Pool({
    connectionString: env.DATABASE_URL
  });
}

export function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }

  return db;
}

export type Database = ReturnType<typeof getDb>;
