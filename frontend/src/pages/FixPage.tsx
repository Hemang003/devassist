/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { useMemo, useState } from 'react';
import { FeatureScaffold } from '@/components/FeatureScaffold';
import { Diff } from '@/components/Diff';
import { useStream } from '@/hooks/useStream';

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'csharp'];

export function FixPage() {
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const stream = useStream();

  const fixed = useMemo(() => extractFixedCode(stream.output), [stream.output]);

  return (
    <>
      <FeatureScaffold
        title="Bug Fixer"
        description="Paste broken code and (optionally) the error you're seeing. Receive a diagnosis, a fix, and a changelog."
        controls={
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Language</label>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Error message (optional)</label>
              <input
                className="input"
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="e.g. TypeError: cannot read properties of undefined…"
              />
            </div>
          </div>
        }
        language={language}
        code={code}
        setCode={setCode}
        onRun={() => stream.start('fix-bug', { language, code, errorMessage })}
        onCancel={stream.cancel}
        state={stream.state}
        output={stream.output}
        cached={stream.cached}
        tokensUsed={stream.tokensUsed}
        errorMessage={stream.errorMessage}
        extra={
          stream.state === 'done' && fixed && code ? (
            <Diff original={code} modified={fixed} filename={`snippet.${shortLang(language)}`} />
          ) : null
        }
      />
    </>
  );
}

function shortLang(lang: string): string {
  switch (lang) {
    case 'typescript': return 'ts';
    case 'javascript': return 'js';
    case 'python': return 'py';
    case 'csharp': return 'cs';
    default: return lang;
  }
}

/**
 * The fix prompt asks for a "## Fixed code" section with a single fenced
 * block. We pull it out here to feed the side-by-side diff view.
 */
function extractFixedCode(output: string): string | null {
  const match = output.match(/##\s*Fixed code\s*\n+```[a-z0-9-]*\n([\s\S]*?)```/i);
  return match ? match[1].trimEnd() : null;
}
