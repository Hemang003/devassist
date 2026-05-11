/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Shared streaming machinery for the AI-engine routes. Encapsulates:
 *   1. SSE headers + heartbeat,
 *   2. Cache lookup (skip the engine if we've answered this input before),
 *   3. Token streaming from the AI engine,
 *   4. Archival to S3 and metadata write to Postgres,
 *   5. Cache population.
 *
 * Each feature controller only needs to provide a system prompt, a user
 * prompt, an input hash, and a feature key.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { streamCompletion } from '@/services/ai.service';
import { archiveOutput, buildHistoryKey } from '@/services/s3.service';
import { getCachedResponse, hashInput, setCachedResponse } from '@/services/cache.service';
import { Requests } from '@/db/repositories';
import { logger } from '@/services/logger.service';
import type { Feature } from '@/types/domain';

const HEARTBEAT_MS = 15_000;

export interface StreamConfig {
  feature: Feature;
  language: string | null;
  systemPrompt: string;
  userPrompt: string;
  cacheable: boolean;
  cacheKeyParts: Record<string, unknown>;
  rawInput: string;
}

export async function streamAndArchive(
  req: Request,
  res: Response,
  cfg: StreamConfig,
): Promise<void> {
  const userId = req.user!.id;
  const inputHash = hashInput(cfg.cacheKeyParts);
  const requestId = uuidv4();

  // SSE preamble.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    // Comment-line ping; browsers ignore it but it keeps proxies from closing the socket.
    res.write(':\n\n');
  }, HEARTBEAT_MS);

  const cleanup = () => clearInterval(heartbeat);
  req.on('close', cleanup);

  send(res, 'meta', { requestId, feature: cfg.feature, cached: false });

  // Cache check (only for the features that opted in).
  if (cfg.cacheable) {
    const hit = await getCachedResponse(inputHash);
    if (hit) {
      send(res, 'meta', { cached: true });
      // Stream the cached payload in chunks so the UI behaves identically to a live call.
      for (const chunk of chunkText(hit.output, 64)) {
        send(res, 'token', { text: chunk });
      }
      send(res, 'done', { tokensUsed: hit.tokensUsed, cached: true });
      cleanup();
      res.end();

      await persist({
        requestId,
        userId,
        feature: cfg.feature,
        language: cfg.language,
        inputHash,
        rawInput: cfg.rawInput,
        output: hit.output,
        tokensUsed: hit.tokensUsed,
        cached: true,
      });
      return;
    }
  }

  // Live engine call.
  let collected = '';
  let tokensUsed = 0;
  try {
    for await (const chunk of streamCompletion({
      systemPrompt: cfg.systemPrompt,
      userPrompt: cfg.userPrompt,
    })) {
      if (chunk.type === 'token' && chunk.text) {
        collected += chunk.text;
        send(res, 'token', { text: chunk.text });
      } else if (chunk.type === 'done') {
        tokensUsed = chunk.tokensUsed ?? 0;
      }
    }
  } catch (err) {
    logger.error('stream failed mid-flight', {
      request_id: req.requestId,
      feature: cfg.feature,
      message: (err as Error).message,
    });
    send(res, 'error', { message: 'Engine error — please retry.' });
    cleanup();
    res.end();
    return;
  }

  send(res, 'done', { tokensUsed, cached: false });
  cleanup();
  res.end();

  // Post-stream housekeeping; the client already has its result so we don't
  // want failures here to surface to the user.
  await persist({
    requestId,
    userId,
    feature: cfg.feature,
    language: cfg.language,
    inputHash,
    rawInput: cfg.rawInput,
    output: collected,
    tokensUsed,
    cached: false,
  });

  if (cfg.cacheable && collected.length > 0) {
    await setCachedResponse(inputHash, {
      output: collected,
      tokensUsed,
      storedAt: new Date().toISOString(),
    });
  }
}

function send(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function* chunkText(text: string, size: number): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

interface PersistInput {
  requestId: string;
  userId: string;
  feature: Feature;
  language: string | null;
  inputHash: string;
  rawInput: string;
  output: string;
  tokensUsed: number;
  cached: boolean;
}

async function persist(input: PersistInput): Promise<void> {
  // S3 archive is best-effort — local dev runs without AWS credentials.
  // We still want the request logged to Postgres so the dashboard reflects it.
  let s3Key: string | null = null;
  try {
    const key = buildHistoryKey(input.userId, input.requestId);
    await archiveOutput(key, {
      feature: input.feature,
      language: input.language,
      input: input.rawInput,
      output: input.output,
      tokensUsed: input.tokensUsed,
      cached: input.cached,
      createdAt: new Date().toISOString(),
    });
    s3Key = key;
  } catch (err) {
    logger.warn('s3 archive failed; continuing without it', {
      message: (err as Error).message,
      user_id: input.userId,
      feature: input.feature,
    });
  }

  try {
    await Requests.record({
      userId: input.userId,
      feature: input.feature,
      language: input.language,
      inputHash: input.inputHash,
      s3Key,
      tokensUsed: input.tokensUsed,
      cached: input.cached,
    });
  } catch (err) {
    logger.error('failed to record request', {
      message: (err as Error).message,
      user_id: input.userId,
      feature: input.feature,
    });
  }
}
