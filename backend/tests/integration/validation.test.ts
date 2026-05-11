/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Verifies the Zod-based validator returns 400s with structured details.
 */

import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '@/middleware/validate';
import { ok } from '@/utils/api';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/echo',
    validate(z.object({ name: z.string().min(2), age: z.coerce.number().int().positive() })),
    (req, res) => ok(res, req.body),
  );
  return app;
}

describe('validate middleware', () => {
  const app = buildApp();

  it('accepts valid input and coerces types', async () => {
    const res = await request(app).post('/echo').send({ name: 'Hemang', age: '34' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ name: 'Hemang', age: 34 });
  });

  it('rejects invalid input with structured details', async () => {
    const res = await request(app).post('/echo').send({ name: 'x', age: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation.failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});
