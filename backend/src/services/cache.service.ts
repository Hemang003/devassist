/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Redis-backed cache (ElastiCache in production, local Redis in dev).
 *
 * The cache key for AI engine responses is a SHA-256 of the normalised
 * (feature + language + options + code) tuple. Identical inputs hit the cache
 * and skip the LLM call entirely — meaningful cost savings on high-traffic
 * features like Explainer.
 */

import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { env } from '@/config/env';
import { logger } from './logger.service';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  // Logged but not fatal — the API degrades gracefully when Redis is down.
  logger.error('redis error', { message: err.message });
});

export function hashInput(parts: Record<string, unknown>): string {
  const canonical = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

export interface CachedResponse {
  output: string;
  tokensUsed: number;
  storedAt: string;
}

const CACHE_PREFIX = 'devassist:ai:';
const SESSION_PREFIX = 'devassist:session:';

export async function getCachedResponse(hash: string): Promise<CachedResponse | null> {
  try {
    const raw = await redis.get(CACHE_PREFIX + hash);
    return raw ? (JSON.parse(raw) as CachedResponse) : null;
  } catch (err) {
    logger.warn('cache read failed', { hash, message: (err as Error).message });
    return null;
  }
}

export async function setCachedResponse(
  hash: string,
  payload: CachedResponse,
  ttlSeconds = 3600,
): Promise<void> {
  try {
    await redis.set(CACHE_PREFIX + hash, JSON.stringify(payload), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('cache write failed', { hash, message: (err as Error).message });
  }
}

// Session helpers — used to track active websocket connections per user.
export async function trackSession(userId: string, sessionId: string, ttl = 3600): Promise<void> {
  await redis.set(`${SESSION_PREFIX}${userId}:${sessionId}`, '1', 'EX', ttl);
}

export async function dropSession(userId: string, sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${userId}:${sessionId}`);
}

export async function shutdownCache(): Promise<void> {
  await redis.quit();
}
