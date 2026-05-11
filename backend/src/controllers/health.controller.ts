/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Health and status endpoints. `/health` is a cheap liveness probe (used by
 * the EC2 systemd unit and the ALB). `/status` does a deeper readiness check
 * against Postgres and Redis — useful for the API Gateway-fronted status
 * page.
 */

import type { Request, Response } from 'express';
import { pool } from '@/db';
import { redis } from '@/services/cache.service';
import { ok, fail } from '@/utils/api';

export function health(_req: Request, res: Response): void {
  ok(res, { status: 'ok' });
}

export async function status(_req: Request, res: Response): Promise<void> {
  const checks = await Promise.allSettled([
    pool.query('SELECT 1'),
    redis.ping(),
  ]);

  const [pg, cache] = checks;
  const result = {
    database: pg.status === 'fulfilled' ? 'ok' : 'down',
    cache: cache.status === 'fulfilled' ? 'ok' : 'down',
    uptimeSeconds: Math.round(process.uptime()),
    version: process.env.npm_package_version ?? '1.0.0',
  };

  if (result.database === 'down' || result.cache === 'down') {
    fail(res, 503, 'status.degraded', 'One or more dependencies are down', result);
    return;
  }
  ok(res, result);
}
