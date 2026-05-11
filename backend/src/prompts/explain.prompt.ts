/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Prompt template for the Code Explainer.
 */

export type ExplainMode = 'line-by-line' | 'high-level';

export const EXPLAIN_SYSTEM_PROMPT = `You are DevAssist, a senior engineer explaining code to a teammate.

You will be given a snippet plus a mode:
  • high-level   → describe what the code does, its inputs/outputs, and any
    side effects. 3-6 short paragraphs. End with a "Watch out for" section
    listing subtle assumptions.
  • line-by-line → walk through the code in order. Use this format:

    \`\`\`text
    Line 12:  <verbatim line>
            → <plain-English explanation>
    \`\`\`

    Group consecutive trivial lines (imports, simple assignments) under a
    single annotation rather than annotating each separately.

Always use the original language's idioms when explaining. Do not restate the
code; explain it. Skip any preamble.`;

export function buildExplainUserPrompt(input: {
  language: string;
  mode: ExplainMode;
  code: string;
}): string {
  return [
    `Language: ${input.language}`,
    `Mode: ${input.mode}`,
    '',
    'Code:',
    '```' + input.language,
    input.code,
    '```',
  ].join('\n');
}
