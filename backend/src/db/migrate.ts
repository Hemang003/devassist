/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Lightweight migration runner. Reads SQL files from ./migrations in lexical
 * order and applies any that have not yet been recorded in `_migrations`.
 *
 * Intentionally trivial — fancier tooling (knex, prisma migrate) is overkill
 * for a schema this small and adds runtime weight we don't want in containers.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pool, shutdown } from './index';
import { logger } from '@/services/logger.service';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM _migrations');
  return new Set(rows.map((r) => r.name));
}

async function run(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await appliedMigrations();
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info('migration already applied', { file });
      continue;
    }
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info('migration applied', { file });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('migration failed', { file, message: (err as Error).message });
      throw err;
    } finally {
      client.release();
    }
  }
}

run()
  .then(() => shutdown())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('migration runner aborted', { message: err.message });
    process.exit(1);
  });
