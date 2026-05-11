/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Thin glue layer between validated request payloads and the streaming
 * machinery. Adding a new feature is: write a prompt, add a schema, add a
 * controller stub here, mount it in routes/ai.ts.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  REVIEW_SYSTEM_PROMPT,
  buildReviewUserPrompt,
  EXPLAIN_SYSTEM_PROMPT,
  buildExplainUserPrompt,
  TEST_GEN_SYSTEM_PROMPT,
  buildTestGenUserPrompt,
  FIX_SYSTEM_PROMPT,
  buildFixUserPrompt,
  REFACTOR_SYSTEM_PROMPT,
  buildRefactorUserPrompt,
} from '@/prompts';
import { streamAndArchive } from './stream';

const code = z.string().min(1, 'Code is required').max(50_000, 'Code is too large (max 50KB)');
const language = z.string().min(1).max(32);

export const reviewSchema = z.object({
  language,
  reviewType: z.enum(['bugs', 'security', 'performance', 'best-practices']),
  code,
});

export const explainSchema = z.object({
  language,
  mode: z.enum(['line-by-line', 'high-level']),
  code,
});

export const generateTestsSchema = z.object({
  language,
  framework: z.enum(['jest', 'pytest', 'junit', 'go-test']),
  code,
});

export const fixBugSchema = z.object({
  language,
  code,
  errorMessage: z.string().max(8_000).optional(),
});

export const refactorSchema = z.object({
  language,
  goal: z.enum(['readability', 'performance', 'dry', 'modularization']),
  code,
});

export async function review(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof reviewSchema>;
  await streamAndArchive(req, res, {
    feature: 'review',
    language: body.language,
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    userPrompt: buildReviewUserPrompt(body),
    cacheable: false,
    cacheKeyParts: { feature: 'review', ...body },
    rawInput: body.code,
  });
}

export async function explain(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof explainSchema>;
  await streamAndArchive(req, res, {
    feature: 'explain',
    language: body.language,
    systemPrompt: EXPLAIN_SYSTEM_PROMPT,
    userPrompt: buildExplainUserPrompt(body),
    // Explanations of identical inputs are deterministic enough to cache.
    cacheable: true,
    cacheKeyParts: { feature: 'explain', ...body },
    rawInput: body.code,
  });
}

export async function generateTests(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof generateTestsSchema>;
  await streamAndArchive(req, res, {
    feature: 'generate-tests',
    language: body.language,
    systemPrompt: TEST_GEN_SYSTEM_PROMPT,
    userPrompt: buildTestGenUserPrompt(body),
    cacheable: false,
    cacheKeyParts: { feature: 'generate-tests', ...body },
    rawInput: body.code,
  });
}

export async function fixBug(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof fixBugSchema>;
  await streamAndArchive(req, res, {
    feature: 'fix-bug',
    language: body.language,
    systemPrompt: FIX_SYSTEM_PROMPT,
    userPrompt: buildFixUserPrompt(body),
    cacheable: false,
    cacheKeyParts: { feature: 'fix-bug', ...body },
    rawInput: body.code,
  });
}

export async function refactor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof refactorSchema>;
  await streamAndArchive(req, res, {
    feature: 'refactor',
    language: body.language,
    systemPrompt: REFACTOR_SYSTEM_PROMPT,
    userPrompt: buildRefactorUserPrompt(body),
    cacheable: false,
    cacheKeyParts: { feature: 'refactor', ...body },
    rawInput: body.code,
  });
}
