/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Common page layout for the five AI features: title, description, controls
 * column, code editor, output panel. Each feature page only supplies its
 * specific control widgets and submit handler.
 */

import type { ReactNode } from 'react';
import { CodeEditor } from './CodeEditor';
import { StreamingOutput } from './StreamingOutput';
import type { StreamState } from '@/hooks/useStream';

interface Props {
  title: string;
  description: string;
  controls: ReactNode;
  language: string;
  code: string;
  setCode: (v: string) => void;
  onRun: () => void;
  onCancel?: () => void;
  state: StreamState;
  output: string;
  cached: boolean;
  tokensUsed: number;
  errorMessage: string | null;
  extra?: ReactNode;
}

export function FeatureScaffold({
  title,
  description,
  controls,
  language,
  code,
  setCode,
  onRun,
  onCancel,
  state,
  output,
  cached,
  tokensUsed,
  errorMessage,
  extra,
}: Props) {
  const running = state === 'streaming';
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-ink-400 mt-1">{description}</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            {controls}
            <CodeEditor language={language} value={code} onChange={setCode} />
            <div className="flex items-center gap-3">
              <button onClick={onRun} disabled={running || code.trim().length === 0} className="btn-primary">
                {running ? 'Streaming…' : 'Run'}
              </button>
              {running && onCancel && (
                <button onClick={onCancel} className="btn-ghost">Cancel</button>
              )}
            </div>
          </div>
          {extra}
        </div>

        <StreamingOutput
          output={output}
          state={state}
          cached={cached}
          tokensUsed={tokensUsed}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
