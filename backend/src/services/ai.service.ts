/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Single point of contact with the AI engine. All feature controllers go
 * through `streamCompletion` so streaming, retries, telemetry and token
 * accounting stay consistent.
 *
 * The transport is intentionally provider-agnostic at the type level — if we
 * ever swap engines the public surface (the async iterator of token chunks)
 * stays the same.
 */

import EngineSDK from 'groq-sdk';
import { env } from '@/config/env';
import { logger } from './logger.service';

const client = new EngineSDK({ apiKey: env.AI_ENGINE_API_KEY });

export interface CompletionInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionChunk {
  type: 'token' | 'done';
  text?: string;
  tokensUsed?: number;
}

/**
 * Streams the engine response as `{ type: 'token', text }` events followed by
 * a single `{ type: 'done', tokensUsed }`. Errors propagate normally — callers
 * are responsible for surfacing them to the SSE client and writing the failure
 * to the request log.
 */
interface StreamUsage {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export async function* streamCompletion(input: CompletionInput): AsyncGenerator<CompletionChunk> {
  const start = Date.now();

  // The SDK's static types trail the underlying API — `stream_options` and the
  // per-chunk `usage` field are valid at runtime. Cast at the boundary so the
  // rest of this file stays strict.
  const params = {
    model: env.AI_ENGINE_MODEL,
    max_tokens: input.maxTokens ?? env.AI_ENGINE_MAX_TOKENS,
    temperature: input.temperature ?? 0.2,
    messages: [
      { role: 'system' as const, content: input.systemPrompt },
      { role: 'user' as const, content: input.userPrompt },
    ],
    stream: true as const,
    stream_options: { include_usage: true },
  };

  const stream = (await client.chat.completions.create(
    params as unknown as Parameters<typeof client.chat.completions.create>[0],
  )) as AsyncIterable<{
    choices?: Array<{ delta?: { content?: string } }>;
    usage?: StreamUsage;
  }>;

  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  for await (const chunk of stream) {
    // The final chunk carries `usage` and has empty `choices`; guard accordingly.
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) {
      yield { type: 'token', text };
    }
    const usage = chunk.usage;
    if (usage?.total_tokens) {
      totalTokens = usage.total_tokens;
      promptTokens = usage.prompt_tokens ?? promptTokens;
      completionTokens = usage.completion_tokens ?? completionTokens;
    }
  }

  logger.debug('engine completion finished', {
    ms: Date.now() - start,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  });

  yield { type: 'done', tokensUsed: totalTokens };
}

/**
 * Convenience helper for callers that don't care about streaming — collects
 * the full text and returns it alongside the token count. Used by features
 * that hit the cache path (cached responses bypass streaming).
 */
export async function collectCompletion(
  input: CompletionInput,
): Promise<{ output: string; tokensUsed: number }> {
  let output = '';
  let tokensUsed = 0;
  for await (const chunk of streamCompletion(input)) {
    if (chunk.type === 'token' && chunk.text) output += chunk.text;
    if (chunk.type === 'done') tokensUsed = chunk.tokensUsed ?? 0;
  }
  return { output, tokensUsed };
}
