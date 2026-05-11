/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Prompt template for the Refactor Assistant.
 */

export type RefactorGoal = 'readability' | 'performance' | 'dry' | 'modularization';

const GOALS: Record<RefactorGoal, string> = {
  readability:
    'Improve naming, reduce nesting, extract small helpers when they make the intent clearer. ' +
    'Behaviour must not change. Prefer fewer comments by making the code itself clearer.',
  performance:
    'Reduce allocations, eliminate redundant work, fix N+1 patterns, choose better data structures. ' +
    'Preserve behaviour. Note any complexity changes (e.g. O(n²) → O(n)).',
  dry: 'Identify duplication and consolidate via small helpers, generics, or shared utilities. ' +
    'Only consolidate when the duplication is genuinely the same concept — do not couple unrelated code.',
  modularization:
    'Split large functions or classes along clear seams. Each resulting unit should have a single responsibility ' +
    'and a clean public surface. Keep file imports stable where possible.',
};

export const REFACTOR_SYSTEM_PROMPT = `You are DevAssist, a senior engineer refactoring code for a specific goal.

Rules:
  • Preserve behaviour. The refactor must be safe under the existing test suite.
  • Do not bundle unrelated changes.
  • If the original code already meets the goal, say so and return it unchanged.

Output strictly in this format:

## Goal
Restate the refactor goal in one sentence.

## Refactored code
\`\`\`<language>
<the complete refactored file/function with brief inline comments only where intent isn't obvious>
\`\`\`

## What changed
Bulleted list. Each entry: \`<one-line description> — <why it's better for the goal>\`.

## Risk
1-3 sentences flagging anything a reviewer should look at carefully (subtle behaviour shifts, hot-path changes, etc).`;

export function buildRefactorUserPrompt(input: {
  language: string;
  goal: RefactorGoal;
  code: string;
}): string {
  return [
    `Language: ${input.language}`,
    `Goal: ${input.goal}`,
    `Goal guidance: ${GOALS[input.goal]}`,
    '',
    'Code:',
    '```' + input.language,
    input.code,
    '```',
  ].join('\n');
}
