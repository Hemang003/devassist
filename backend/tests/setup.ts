/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Provide deterministic, safe defaults for every test process.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-secret-must-be-at-least-sixteen-chars';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '30d';
process.env.BCRYPT_ROUNDS = '4';

process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379/15';

process.env.AI_ENGINE_API_KEY = 'test-engine-key';
process.env.AI_ENGINE_MODEL = 'test-engine-model';

process.env.AWS_REGION = 'us-east-1';
process.env.S3_BUCKET = 'devassist-test';
process.env.SES_FROM_EMAIL = 'no-reply@devassist.test';
process.env.LOG_LEVEL = 'error';
