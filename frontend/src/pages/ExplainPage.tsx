/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { useState, type ReactNode } from 'react';
import { FeatureScaffold } from '@/components/FeatureScaffold';
import { useStream } from '@/hooks/useStream';

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp', 'ruby'];

export function ExplainPage() {
  const [language, setLanguage] = useState('typescript');
  const [mode, setMode] = useState<'high-level' | 'line-by-line'>('high-level');
  const [code, setCode] = useState('');
  const stream = useStream();

  return (
    <FeatureScaffold
      title="Code Explainer"
      description="Get a clear walkthrough of unfamiliar code. Identical inputs are served from cache."
      controls={
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mode</label>
            <div className="flex gap-2">
              <ToggleButton active={mode === 'high-level'} onClick={() => setMode('high-level')}>High-level</ToggleButton>
              <ToggleButton active={mode === 'line-by-line'} onClick={() => setMode('line-by-line')}>Line-by-line</ToggleButton>
            </div>
          </div>
        </div>
      }
      language={language}
      code={code}
      setCode={setCode}
      onRun={() => stream.start('explain', { language, mode, code })}
      onCancel={stream.cancel}
      state={stream.state}
      output={stream.output}
      cached={stream.cached}
      tokensUsed={stream.tokensUsed}
      errorMessage={stream.errorMessage}
    />
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex-1 px-3 py-2 rounded-lg border text-sm transition ' +
        (active ? 'bg-brand-500 text-white border-brand-500' : 'border-white/10 text-ink-300 hover:bg-white/5')
      }
    >
      {children}
    </button>
  );
}
