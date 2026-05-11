/*
 * Copyright (c) 2024 Hemang Parmar
 */

import {
  hashPassword,
  issueAccessToken,
  verifyAccessToken,
  verifyPassword,
} from '@/services/auth.service';

describe('auth.service', () => {
  describe('password hashing', () => {
    it('round-trips a correct password', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(await verifyPassword('wrong password', hash)).toBe(false);
    });
  });

  describe('access tokens', () => {
    it('issues a verifiable JWT', () => {
      const token = issueAccessToken({ sub: 'user-1', email: 'a@b.com' });
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe('user-1');
      expect(decoded.email).toBe('a@b.com');
    });

    it('rejects tampered tokens', () => {
      const token = issueAccessToken({ sub: 'user-1', email: 'a@b.com' });
      const tampered = token.slice(0, -2) + 'xx';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });
});
