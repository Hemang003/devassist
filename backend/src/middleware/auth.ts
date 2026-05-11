/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Bearer-token gate. Verifies the JWT, attaches `req.user`.
 *
 * SSE endpoints can authenticate via either the `Authorization` header or an
 * `access_token` query string parameter (EventSource cannot set headers).
 */

import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/services/auth.service';
import { fail } from '@/utils/api';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    fail(res, 401, 'auth.missing', 'Authentication required');
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    fail(res, 401, 'auth.invalid', 'Invalid or expired token');
  }
}

function extractToken(req: Request): string | null {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const queryToken = req.query.access_token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }
  return null;
}
