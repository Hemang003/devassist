/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { hashInput } from '@/services/cache.service';

describe('cache.service.hashInput', () => {
  it('is deterministic across key order', () => {
    const a = hashInput({ feature: 'review', language: 'ts', code: 'x' });
    const b = hashInput({ code: 'x', language: 'ts', feature: 'review' });
    expect(a).toBe(b);
  });

  it('differs when inputs differ', () => {
    const a = hashInput({ code: 'a' });
    const b = hashInput({ code: 'b' });
    expect(a).not.toBe(b);
  });

  it('returns a sha-256 length string', () => {
    expect(hashInput({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
