/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { useState } from 'react';
import { FeatureScaffold } from '@/components/FeatureScaffold';
import { useStream } from '@/hooks/useStream';

const REVIEW_TYPES = [
  { value: 'bugs', label: 'Bug Detection' },
  { value: 'security', label: 'Security Audit' },
  { value: 'performance', label: 'Performance' },
  { value: 'best-practices', label: 'Best Practices' },
] as const;

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp', 'ruby'];

export function ReviewPage() {
  const [language, setLanguage] = useState('typescript');
  const [reviewType, setReviewType] = useState<typeof REVIEW_TYPES[number]['value']>('bugs');
  const [code, setCode] = useState('');
  const stream = useStream();

  const onRun = () => stream.start('review', { language, reviewType, code });

  return (
    <FeatureScaffold
      title="Code Review Assistant"
      description="Paste a snippet and get a structured review with severity-tagged issues and concrete fixes."
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
            <label className="label">Review focus</label>
            <select className="input" value={reviewType} onChange={(e) => setReviewType(e.target.value as typeof REVIEW_TYPES[number]['value'])}>
              {REVIEW_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      }
      language={language}
      code={code}
      setCode={setCode}
      onRun={onRun}
      onCancel={stream.cancel}
      state={stream.state}
      output={stream.output}
      cached={stream.cached}
      tokensUsed={stream.tokensUsed}
      errorMessage={stream.errorMessage}
    />
  );
}
