/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Wraps the SSE client in a React-friendly state machine. Components only
 * need `state`, `output`, and `start()`; cancellation is automatic on unmount
 * and when a new request begins.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { streamRequest } from '@/api/stream';

export type StreamState = 'idle' | 'streaming' | 'done' | 'error';

interface UseStreamResult {
  state: StreamState;
  output: string;
  cached: boolean;
  tokensUsed: number;
  errorMessage: string | null;
  start: (endpoint: string, body: unknown) => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export function useStream(): UseStreamResult {
  const [state, setState] = useState<StreamState>('idle');
  const [output, setOutput] = useState('');
  const [cached, setCached] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState('idle');
    setOutput('');
    setCached(false);
    setTokensUsed(0);
    setErrorMessage(null);
  }, [cancel]);

  const start = useCallback(async (endpoint: string, body: unknown) => {
    cancel();
    const controller = new AbortController();
    abortRef.current = controller;
    setState('streaming');
    setOutput('');
    setErrorMessage(null);
    setCached(false);

    try {
      await streamRequest(endpoint, body, {
        signal: controller.signal,
        onMeta: (m) => {
          if (m.cached !== undefined) setCached(m.cached);
        },
        onToken: (text) => setOutput((prev) => prev + text),
        onDone: ({ tokensUsed: t, cached: c }) => {
          setTokensUsed(t);
          setCached(c);
          setState('done');
        },
        onError: (msg) => {
          setErrorMessage(msg);
          setState('error');
        },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setErrorMessage((err as Error).message);
      setState('error');
    }
  }, [cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return { state, output, cached, tokensUsed, errorMessage, start, reset, cancel };
}
