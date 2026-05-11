/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Streaming client for the SSE-based AI endpoints. We use `fetch` with a
 * `ReadableStream` reader rather than `EventSource` because:
 *   1. EventSource does not support custom headers (we need Bearer auth).
 *   2. We POST a JSON body — EventSource is GET-only.
 *
 * Surface: callers pass a body and per-event handlers; the function resolves
 * when the server sends `done`, rejects on transport or `error` events.
 */

import { getAccessToken } from './client';
import type { Feature } from '@/types/api';

export type StreamEvent =
  | { type: 'meta'; requestId?: string; feature?: Feature; cached?: boolean }
  | { type: 'token'; text: string }
  | { type: 'done'; tokensUsed: number; cached: boolean }
  | { type: 'error'; message: string };

export interface StreamHandlers {
  onMeta?: (e: Extract<StreamEvent, { type: 'meta' }>) => void;
  onToken?: (text: string) => void;
  onDone?: (info: { tokensUsed: number; cached: boolean }) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

export async function streamRequest(
  endpoint: string,
  body: unknown,
  handlers: StreamHandlers,
): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const json = await res.json();
      if (json?.error?.message) message = json.error.message as string;
    } catch {
      /* non-JSON error body */
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseFrame(raw);
      if (event) dispatch(event, handlers);
      boundary = buffer.indexOf('\n\n');
    }
  }
}

function parseSseFrame(frame: string): StreamEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue; // heartbeat / comment
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    const data = JSON.parse(dataLines.join('\n'));
    return { type: event as StreamEvent['type'], ...data } as StreamEvent;
  } catch {
    return null;
  }
}

function dispatch(event: StreamEvent, handlers: StreamHandlers): void {
  switch (event.type) {
    case 'meta':
      handlers.onMeta?.(event);
      break;
    case 'token':
      handlers.onToken?.(event.text);
      break;
    case 'done':
      handlers.onDone?.({ tokensUsed: event.tokensUsed, cached: event.cached });
      break;
    case 'error':
      handlers.onError?.(event.message);
      break;
  }
}
