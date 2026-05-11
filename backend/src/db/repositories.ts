/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Thin data-access layer. Keeps SQL out of controllers and gives services a
 * stable surface to depend on.
 */

import { query } from './index';
import type { Feature, RequestRow, UsageRow, UserRow, RefreshTokenRow } from '@/types/domain';

export const Users = {
  async create(email: string, passwordHash: string): Promise<UserRow> {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, password_hash, created_at, email_verified`,
      [email, passwordHash],
    );
    return rows[0];
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(
      `SELECT id, email, password_hash, created_at, email_verified
       FROM users WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await query<UserRow>(
      `SELECT id, email, password_hash, created_at, email_verified
       FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async markVerified(id: string): Promise<void> {
    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [id]);
  },
};

export const RefreshTokens = {
  async store(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRow> {
    const { rows } = await query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at, created_at, revoked_at`,
      [userId, tokenHash, expiresAt],
    );
    return rows[0];
  },

  async findActiveByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const { rows } = await query<RefreshTokenRow>(
      `SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async revoke(tokenHash: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  },
};

export const Requests = {
  async record(input: {
    userId: string;
    feature: Feature;
    language: string | null;
    inputHash: string;
    s3Key: string | null;
    tokensUsed: number;
    cached: boolean;
  }): Promise<RequestRow> {
    const { rows } = await query<RequestRow>(
      `INSERT INTO requests
         (user_id, feature_type, language, input_hash, s3_output_key, tokens_used, cached)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, feature_type, language, input_hash, s3_output_key,
                 tokens_used, cached, created_at`,
      [
        input.userId,
        input.feature,
        input.language,
        input.inputHash,
        input.s3Key,
        input.tokensUsed,
        input.cached,
      ],
    );
    return rows[0];
  },

  async listByUser(userId: string, limit = 50, offset = 0): Promise<RequestRow[]> {
    const { rows } = await query<RequestRow>(
      `SELECT id, user_id, feature_type, language, input_hash, s3_output_key,
              tokens_used, cached, created_at
       FROM requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  },

  async findByIdForUser(id: string, userId: string): Promise<RequestRow | null> {
    const { rows } = await query<RequestRow>(
      `SELECT id, user_id, feature_type, language, input_hash, s3_output_key,
              tokens_used, cached, created_at
       FROM requests
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  },

  async dailyTotalsForUser(userId: string, days: number): Promise<Array<{ date: string; count: number; tokens: number }>> {
    const { rows } = await query<{ date: string; count: string; tokens: string }>(
      `SELECT TO_CHAR(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
              COUNT(*)::TEXT AS count,
              COALESCE(SUM(tokens_used), 0)::TEXT AS tokens
       FROM requests
       WHERE user_id = $1
         AND created_at >= NOW() - ($2::INTEGER || ' days')::INTERVAL
       GROUP BY 1
       ORDER BY 1 ASC`,
      [userId, days],
    );
    return rows.map((r) => ({ date: r.date, count: Number(r.count), tokens: Number(r.tokens) }));
  },

  async featureBreakdownForUser(userId: string, days: number): Promise<Record<string, number>> {
    const { rows } = await query<{ feature_type: string; count: string }>(
      `SELECT feature_type, COUNT(*)::TEXT AS count
       FROM requests
       WHERE user_id = $1
         AND created_at >= NOW() - ($2::INTEGER || ' days')::INTERVAL
       GROUP BY feature_type`,
      [userId, days],
    );
    return Object.fromEntries(rows.map((r) => [r.feature_type, Number(r.count)]));
  },

  async totalTokensForUser(userId: string): Promise<number> {
    const { rows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(tokens_used), 0)::TEXT AS total
       FROM requests WHERE user_id = $1`,
      [userId],
    );
    return Number(rows[0]?.total ?? 0);
  },
};

export const UsageStats = {
  async upsertDaily(input: {
    userId: string;
    date: string;
    requestCount: number;
    tokensUsed: number;
    breakdown: Record<string, number>;
  }): Promise<void> {
    await query(
      `INSERT INTO usage_stats (user_id, date, request_count, tokens_used, feature_breakdown)
       VALUES ($1, $2, $3, $4, $5::JSONB)
       ON CONFLICT (user_id, date) DO UPDATE SET
         request_count = EXCLUDED.request_count,
         tokens_used = EXCLUDED.tokens_used,
         feature_breakdown = EXCLUDED.feature_breakdown`,
      [input.userId, input.date, input.requestCount, input.tokensUsed, JSON.stringify(input.breakdown)],
    );
  },

  async forUser(userId: string, days: number): Promise<UsageRow[]> {
    const { rows } = await query<UsageRow>(
      `SELECT id, user_id, date, request_count, tokens_used, feature_breakdown
       FROM usage_stats
       WHERE user_id = $1
         AND date >= CURRENT_DATE - ($2::INTEGER)
       ORDER BY date DESC`,
      [userId, days],
    );
    return rows;
  },
};
