/*
 * Copyright (c) 2024 Hemang Parmar
 */

import {
  buildExplainUserPrompt,
  buildFixUserPrompt,
  buildRefactorUserPrompt,
  buildReviewUserPrompt,
  buildTestGenUserPrompt,
  EXPLAIN_SYSTEM_PROMPT,
  FIX_SYSTEM_PROMPT,
  REFACTOR_SYSTEM_PROMPT,
  REVIEW_SYSTEM_PROMPT,
  TEST_GEN_SYSTEM_PROMPT,
} from '@/prompts';

describe('prompt builders', () => {
  const code = 'function add(a, b) { return a + b; }';

  it('builds a review prompt with language and focus', () => {
    const out = buildReviewUserPrompt({ language: 'ts', reviewType: 'bugs', code });
    expect(out).toContain('Language: ts');
    expect(out).toContain('Review focus: BUGS');
    expect(out).toContain(code);
  });

  it('builds an explain prompt with mode', () => {
    const out = buildExplainUserPrompt({ language: 'ts', mode: 'high-level', code });
    expect(out).toContain('Mode: high-level');
    expect(out).toContain(code);
  });

  it('builds a test-gen prompt with framework notes', () => {
    const out = buildTestGenUserPrompt({ language: 'ts', framework: 'jest', code });
    expect(out).toContain('Framework: jest');
    expect(out).toContain('Jest');
  });

  it('builds a fix prompt with and without an error message', () => {
    const with_err = buildFixUserPrompt({ language: 'ts', code, errorMessage: 'TypeError: x' });
    expect(with_err).toContain('TypeError: x');

    const no_err = buildFixUserPrompt({ language: 'ts', code });
    expect(no_err).toContain('Diagnose from the code alone');
  });

  it('builds a refactor prompt with goal guidance', () => {
    const out = buildRefactorUserPrompt({ language: 'ts', goal: 'readability', code });
    expect(out).toContain('Goal: readability');
    expect(out).toMatch(/Goal guidance/);
  });

  it('exposes non-empty system prompts for every feature', () => {
    for (const sys of [
      REVIEW_SYSTEM_PROMPT,
      EXPLAIN_SYSTEM_PROMPT,
      TEST_GEN_SYSTEM_PROMPT,
      FIX_SYSTEM_PROMPT,
      REFACTOR_SYSTEM_PROMPT,
    ]) {
      expect(sys.length).toBeGreaterThan(100);
    }
  });
});
