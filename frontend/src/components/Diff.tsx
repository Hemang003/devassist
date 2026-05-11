/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Side-by-side diff using diff2html. Used by the Bug Fixer to show
 * original vs fixed.
 */

import { html as diff2htmlRender, parse as diff2htmlParse } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { useMemo } from 'react';

interface Props {
  original: string;
  modified: string;
  filename?: string;
}

export function Diff({ original, modified, filename = 'snippet' }: Props) {
  const html = useMemo(() => {
    const patch = makeUnifiedDiff(filename, original, modified);
    const parsed = diff2htmlParse(patch);
    return diff2htmlRender(parsed, {
      drawFileList: false,
      matching: 'lines',
      outputFormat: 'side-by-side',
    });
  }, [original, modified, filename]);

  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3">Diff</h3>
      <div className="diff-container text-xs" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Minimal unified-diff producer. We only need something diff2html can parse;
 * a full diff algorithm would be overkill — this synthesises a single hunk
 * covering the entire snippet which is fine for short pasted code.
 */
function makeUnifiedDiff(filename: string, a: string, b: string): string {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const header =
    `--- a/${filename}\n+++ b/${filename}\n` +
    `@@ -1,${aLines.length} +1,${bLines.length} @@\n`;
  return (
    header +
    aLines.map((l) => `-${l}`).join('\n') +
    '\n' +
    bLines.map((l) => `+${l}`).join('\n') +
    '\n'
  );
}
