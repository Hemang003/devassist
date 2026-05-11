/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { useState } from 'react';
import { FeatureScaffold } from '@/components/FeatureScaffold';
import { useStream } from '@/hooks/useStream';

const FRAMEWORKS = [
  { value: 'jest', label: 'Jest' },
  { value: 'pytest', label: 'PyTest' },
  { value: 'junit', label: 'JUnit' },
  { value: 'go-test', label: 'go test' },
] as const;

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'java', 'csharp'];

export function TestsPage() {
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState<typeof FRAMEWORKS[number]['value']>('jest');
  const [code, setCode] = useState('');
  const stream = useStream();

  return (
    <FeatureScaffold
      title="Test Generator"
      description="Generate a complete test suite with mocks and edge cases for a function or class."
      controls={
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Framework</label>
            <select className="input" value={framework} onChange={(e) => setFramework(e.target.value as typeof FRAMEWORKS[number]['value'])}>
              {FRAMEWORKS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
      }
      language={language}
      code={code}
      setCode={setCode}
      onRun={() => stream.start('generate-tests', { language, framework, code })}
      onCancel={stream.cancel}
      state={stream.state}
      output={stream.output}
      cached={stream.cached}
      tokensUsed={stream.tokensUsed}
      errorMessage={stream.errorMessage}
      extra={
        stream.state === 'done' && stream.output ? (
          <div className="card p-4 flex items-center justify-between">
            <span className="text-sm text-ink-400">Copy the suite into your project.</span>
            <button
              className="btn-ghost text-sm py-1.5 px-3"
              onClick={() => navigator.clipboard.writeText(stream.output)}
            >
              Copy output
            </button>
          </div>
        ) : null
      }
    />
  );
}
