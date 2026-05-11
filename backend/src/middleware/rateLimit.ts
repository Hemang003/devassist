/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Per-user rate limit for AI engine calls. Uses Redis as the backing store so
 * counters survive a single-process restart and shard across replicas. Falls
 * back to in-memory if Redis is unreachable — we'd rather degrade to local
 * limits than fail open globally.
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import type { Request } from 'express';
import { redis } from '@/services/cache.service';
import { env } from '@/config/env';
import { logger } from '@/services/logger.service';

function buildStore(): RedisStore | undefined {
  try {
    return new RedisStore({
      // rate-limit-redis types `sendCommand` as (cmd, ...args) => Promise<string | number>.
      // ioredis returns Promise<unknown> from `call`, so we narrow at the boundary.
      sendCommand: async (...args: string[]) => {
        const [command, ...rest] = args;
        const result = await redis.call(command, ...rest);
        return result as string | number;
      },
      prefix: 'devassist:rl:ai:',
    });
  } catch (err) {
    logger.warn('redis-backed rate limiter unavailable; using memory store', {
      message: (err as Error).message,
    });
    return undefined;
  }
}

export const aiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.RATE_LIMIT_AI_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'anon',
  store: buildStore(),
  message: {
    success: false,
    data: null,
    error: { code: 'rate_limit.exceeded', message: 'Too many requests — slow down.' },
    timestamp: new Date().toISOString(),
  },
});

// Coarser limit for the open auth endpoints to blunt brute force.
export const authRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'anon',
});
