/*
 * Copyright (c) 2026 Hemang Parmar
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { Users } from '@/db/repositories';
import {
  hashPassword,
  issueAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyPassword,
} from '@/services/auth.service';
import { sendEmail, Templates } from '@/services/email.service';
import { fail, ok } from '@/utils/api';
import { logger } from '@/services/logger.service';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10, 'Password must be at least 10 characters').max(200),
});

export const loginSchema = registerSchema;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as z.infer<typeof registerSchema>;
  const existing = await Users.findByEmail(email);
  if (existing) {
    fail(res, 409, 'auth.email_taken', 'An account with that email already exists');
    return;
  }
  const hash = await hashPassword(password);
  const user = await Users.create(email, hash);
  const accessToken = issueAccessToken({ sub: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);

  // Welcome email is fire-and-forget; users can sign in regardless.
  sendEmail(user.email, Templates.welcome(user.email)).catch((err) =>
    logger.warn('welcome email failed', { user_id: user.id, message: (err as Error).message }),
  );

  ok(res, {
    user: { id: user.id, email: user.email },
    accessToken,
    refreshToken,
  }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await Users.findByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    fail(res, 401, 'auth.invalid_credentials', 'Email or password is incorrect');
    return;
  }
  const accessToken = issueAccessToken({ sub: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id);
  ok(res, {
    user: { id: user.id, email: user.email },
    accessToken,
    refreshToken,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  try {
    const { userId, nextToken } = await rotateRefreshToken(refreshToken);
    const user = await Users.findById(userId);
    if (!user) {
      fail(res, 401, 'auth.invalid', 'Refresh token references unknown user');
      return;
    }
    const accessToken = issueAccessToken({ sub: user.id, email: user.email });
    ok(res, { accessToken, refreshToken: nextToken });
  } catch {
    fail(res, 401, 'auth.invalid', 'Refresh token invalid or expired');
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  await revokeRefreshToken(refreshToken);
  ok(res, { revoked: true });
}

export async function profile(req: Request, res: Response): Promise<void> {
  const user = await Users.findById(req.user!.id);
  if (!user) {
    fail(res, 404, 'user.not_found', 'User not found');
    return;
  }
  ok(res, {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
    emailVerified: user.email_verified,
  });
}
