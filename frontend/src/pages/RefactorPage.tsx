/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { useState } from 'react';
import { FeatureScaffold } from '@/components/FeatureScaffold';
import { useStream } from '@/hooks/useStream';

const GOALS = [
  { value: 'readability', label: 'Readability' },
  { value: 'performance', label: 'Performance' },
  { value: 'dry', label: 'DRY' },
  { value: 'modularization', label: 'Modularization' },
] as const;

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp'];

export function RefactorPage() {
  const [language, setLanguage] = useState('typescript');
  const [goal, setGoal] = useState<typeof GOALS[number]['value']>('readability');
  const [code, setCode] = useState('');
  const stream = useStream();

  return (
    <FeatureScaffold
      title="Refactor Assistant"
      description="Improve a snippet for a specific goal. Behaviour is preserved; risk notes flag anything subtle."
      controls={
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Language</label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Goal</label>
            <select className="input" value={goal} onChange={(e) => setGoal(e.target.value as typeof GOALS[number]['value'])}>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
      }
      language={language}
      code={code}
      setCode={setCode}
      onRun={() => stream.start('refactor', { language, goal, code })}
      onCancel={stream.cancel}
      state={stream.state}
      output={stream.output}
      cached={stream.cached}
      tokensUsed={stream.tokensUsed}
      errorMessage={stream.errorMessage}
    />
  );
}
