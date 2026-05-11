/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Prompt template for the Test Generator.
 */

export type TestFramework = 'jest' | 'pytest' | 'junit' | 'go-test';

const FRAMEWORK_NOTES: Record<TestFramework, string> = {
  jest: 'Use Jest with TypeScript. Prefer `describe` / `it`. Mock dependencies with `jest.mock`. Use `expect` assertions.',
  pytest:
    'Use pytest. Prefer fixture-based setup with `@pytest.fixture`. Use parametrize for table-driven cases. Use `unittest.mock` where mocking is needed.',
  junit: 'Use JUnit 5 (Jupiter). Use `@Test`, `@BeforeEach`, `@ParameterizedTest`. Use Mockito for mocks. Use AssertJ-style assertions if available, otherwise JUnit Assertions.',
  'go-test':
    'Use the standard `testing` package. Prefer table-driven tests with `t.Run` subtests. Use `t.Helper()` in helper functions.',
};

export const TEST_GEN_SYSTEM_PROMPT = `You are DevAssist, a senior engineer writing a complete test suite for a code unit.

Cover:
  1. The golden path (happy case).
  2. Boundary conditions (empty inputs, max sizes, zero, off-by-one neighbours).
  3. Error paths and exception types.
  4. Side effects (anything the unit writes, calls, or mutates).
  5. Concurrency / async behaviour if relevant.

Mock external collaborators — never reach across boundaries (network, FS, DB) in unit tests.

Output strictly in this format:

## Summary
1-2 sentence description of what the suite covers.

## Test file
\`\`\`<framework-language>
<the entire test file, ready to drop in>
\`\`\`

## Coverage notes
Bulleted list of which behaviours each test exercises.`;

export function buildTestGenUserPrompt(input: {
  language: string;
  framework: TestFramework;
  code: string;
}): string {
  return [
    `Language: ${input.language}`,
    `Framework: ${input.framework}`,
    `Framework notes: ${FRAMEWORK_NOTES[input.framework]}`,
    '',
    'Code under test:',
    '```' + input.language,
    input.code,
    '```',
  ].join('\n');
}
