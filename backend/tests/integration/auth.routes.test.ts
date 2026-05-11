/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Auth route integration tests with the Postgres / Redis layers mocked so the
 * suite can run in pure CI without external services.
 */

import request from 'supertest';

jest.mock('@/db/repositories', () => {
  const users = new Map<string, { id: string; email: string; password_hash: string; created_at: Date; email_verified: boolean }>();
  const refreshTokens = new Map<string, { id: string; user_id: string; token_hash: string; expires_at: Date; created_at: Date; revoked_at: Date | null }>();
  let userCounter = 0;
  let tokenCounter = 0;

  return {
    Users: {
      async create(email: string, hash: string) {
        userCounter += 1;
        const row = {
          id: `u-${userCounter}`,
          email,
          password_hash: hash,
          created_at: new Date(),
          email_verified: false,
        };
        users.set(email, row);
        return row;
      },
      async findByEmail(email: string) {
        return users.get(email) ?? null;
      },
      async findById(id: string) {
        for (const u of users.values()) if (u.id === id) return u;
        return null;
      },
    },
    RefreshTokens: {
      async store(userId: string, tokenHash: string, expiresAt: Date) {
        tokenCounter += 1;
        const row = {
          id: `r-${tokenCounter}`,
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: new Date(),
          revoked_at: null,
        };
        refreshTokens.set(tokenHash, row);
        return row;
      },
      async findActiveByHash(hash: string) {
        const row = refreshTokens.get(hash);
        if (!row || row.revoked_at || row.expires_at <= new Date()) return null;
        return row;
      },
      async revoke(hash: string) {
        const row = refreshTokens.get(hash);
        if (row) row.revoked_at = new Date();
      },
      async revokeAllForUser() { /* unused */ },
    },
  };
});

jest.mock('@/services/email.service', () => ({
  Templates: { welcome: () => ({ subject: '', html: '', text: '' }) },
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/middleware/rateLimit', () => ({
  aiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('@/services/cache.service', () => ({
  redis: { call: jest.fn(), ping: jest.fn().mockResolvedValue('PONG'), quit: jest.fn() },
  hashInput: jest.fn().mockReturnValue('hash'),
  getCachedResponse: jest.fn().mockResolvedValue(null),
  setCachedResponse: jest.fn().mockResolvedValue(undefined),
  trackSession: jest.fn(),
  dropSession: jest.fn(),
  shutdownCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/db', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), on: jest.fn() },
  query: jest.fn(),
  withTransaction: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

import { createApp } from '@/app';

const app = createApp();

describe('POST /api/auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@example.com', password: 'a-strong-password' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('a@example.com');
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('rejects duplicate emails', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'a-strong-password' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'a-strong-password' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('auth.email_taken');
  });

  it('rejects weak passwords with validation error', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation.failed');
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'a-strong-password' });
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'a-strong-password' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('auth.invalid_credentials');
  });
});

describe('GET /api/user/profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/user/profile');
    expect(res.status).toBe(401);
  });

  it('returns the user when authenticated', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'profile@example.com', password: 'a-strong-password' });
    const token = reg.body.data.accessToken;
    const res = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('profile@example.com');
  });
});

describe('Health', () => {
  it('GET /api/health is open and returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Not Found', () => {
  it('falls through to 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('route.not_found');
  });
});
