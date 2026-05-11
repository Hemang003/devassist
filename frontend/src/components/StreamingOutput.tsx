/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Renders streaming AI output with a tasteful caret while in flight. The text
 * is shown verbatim as Markdown (we keep this simple — `pre`/`code` blocks
 * inside Tailwind prose styling, no JS-side parser needed for the v1).
 */

import clsx from 'clsx';
import type { StreamState } from '@/hooks/useStream';

interface Props {
  output: string;
  state: StreamState;
  cached: boolean;
  tokensUsed: number;
  errorMessage: string | null;
}

export function StreamingOutput({ output, state, cached, tokensUsed, errorMessage }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Result</h3>
        <div className="flex items-center gap-2 text-xs">
          <StateBadge state={state} cached={cached} />
          {state === 'done' && tokensUsed > 0 && (
            <span className="text-ink-400">{tokensUsed} tokens</span>
          )}
        </div>
      </div>
      {errorMessage && (
        <div className="severity-critical rounded-lg p-3 text-sm mb-3">{errorMessage}</div>
      )}
      <pre className={clsx(
        'whitespace-pre-wrap break-words font-mono text-sm leading-relaxed',
        'min-h-[120px] max-h-[640px] overflow-auto',
      )}>
        {output || (state === 'idle' ? <span className="text-ink-500">Awaiting input…</span> : null)}
        {state === 'streaming' && <span className="inline-block w-2 h-4 align-middle bg-brand-400 ml-0.5 animate-pulse" />}
      </pre>
    </div>
  );
}

function StateBadge({ state, cached }: { state: StreamState; cached: boolean }) {
  const map: Record<StreamState, { label: string; cls: string }> = {
    idle: { label: 'idle', cls: 'bg-ink-700 text-ink-300' },
    streaming: { label: 'streaming', cls: 'bg-brand-500/30 text-brand-200' },
    done: { label: cached ? 'cached' : 'done', cls: cached ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/15 text-emerald-300' },
    error: { label: 'error', cls: 'bg-red-500/20 text-red-300' },
  };
  const { label, cls } = map[state];
  return <span className={clsx('px-2 py-0.5 rounded-full', cls)}>{label}</span>;
}
