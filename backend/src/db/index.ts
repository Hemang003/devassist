/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Postgres connection pool. Single shared pool per process — never instantiate
 * `new Pool()` ad-hoc, always import this module so we honour the `max` cap.
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from '@/config/env';
import { logger } from '@/services/logger.service';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // RDS in production requires TLS; node-postgres expects SSL config rather than a query param.
  ssl: env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  logger.error('postgres pool error', { message: err.message });
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const started = Date.now();
  const result = await pool.query<T>(text, params as unknown[]);
  const duration = Date.now() - started;
  if (duration > 250) {
    logger.warn('slow query', { ms: duration, text: text.slice(0, 120) });
  }
  return result;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function shutdown(): Promise<void> {
  await pool.end();
}

export { pool };
