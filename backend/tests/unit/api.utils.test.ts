/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { fail, ok } from '@/utils/api';

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('api envelope', () => {
  it('wraps a success payload', () => {
    const res = mockRes();
    ok(res as never, { hello: 'world' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { hello: 'world' },
      error: null,
    });
    expect((res.body as { timestamp: string }).timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('wraps a failure payload', () => {
    const res = mockRes();
    fail(res as never, 422, 'val.bad', 'Bad input', { field: 'email' });
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      data: null,
      error: { code: 'val.bad', message: 'Bad input', details: { field: 'email' } },
    });
  });
});
