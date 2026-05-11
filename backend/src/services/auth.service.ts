/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Auth primitives: password hashing, JWT issue/verify, refresh token rotation.
 * Refresh tokens are stored hashed — a DB leak should not yield usable tokens.
 */

import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '@/config/env';
import { RefreshTokens } from '@/db/repositories';

const ACCESS_OPTIONS: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, ACCESS_OPTIONS);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (typeof decoded.sub !== 'string' || typeof decoded.email !== 'string') {
    throw new Error('Malformed access token payload');
  }
  return { sub: decoded.sub, email: decoded.email };
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(48).toString('base64url');
  const hash = sha256(raw);
  const ttlMs = parseDuration(env.JWT_REFRESH_TTL);
  const expiresAt = new Date(Date.now() + ttlMs);
  await RefreshTokens.store(userId, hash, expiresAt);
  return raw;
}

export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; nextToken: string }> {
  const existingHash = sha256(rawToken);
  const row = await RefreshTokens.findActiveByHash(existingHash);
  if (!row) throw new Error('Refresh token invalid or expired');
  await RefreshTokens.revoke(existingHash);
  const nextToken = await issueRefreshToken(row.user_id);
  return { userId: row.user_id, nextToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await RefreshTokens.revoke(sha256(rawToken));
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// Tiny parser for `15m`, `30d`, `12h`, `90s` — sufficient for our config surface.
function parseDuration(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: ${input}`);
  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Invalid duration unit: ${match[2]}`);
  }
}
