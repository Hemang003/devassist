/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Centralised, typed access to environment variables. Validate once at boot
 * so a missing secret blows up immediately instead of mid-request.
 */

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  AI_ENGINE_API_KEY: z.string().min(1),
  AI_ENGINE_MODEL: z.string().min(1, 'AI_ENGINE_MODEL must be set explicitly'),
  AI_ENGINE_MAX_TOKENS: z.coerce.number().int().positive().default(4096),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().min(1),
  SES_FROM_EMAIL: z.string().email(),
  CLOUDWATCH_LOG_GROUP: z.string().default('/devassist/api'),
  CLOUDWATCH_LOG_STREAM: z.string().default('local'),

  RATE_LIMIT_AI_PER_MIN: z.coerce.number().int().positive().default(20),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print and exit; we don't want a half-configured server limping along.
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
