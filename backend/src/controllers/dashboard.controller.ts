/*
 * Copyright (c) 2026 Hemang Parmar
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { Requests } from '@/db/repositories';
import { fetchArchived } from '@/services/s3.service';
import { fail, ok } from '@/utils/api';

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function stats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const [daily, breakdown, totalTokens] = await Promise.all([
    Requests.dailyTotalsForUser(userId, 30),
    Requests.featureBreakdownForUser(userId, 30),
    Requests.totalTokensForUser(userId),
  ]);

  const totalRequests30d = daily.reduce((acc, d) => acc + d.count, 0);
  const tokens30d = daily.reduce((acc, d) => acc + d.tokens, 0);
  const topFeature =
    Object.entries(breakdown).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  // Requests in the last 7 days (calendar days, lower bound).
  const sevenDayThreshold = Date.now() - 7 * 86_400_000;
  const requestsThisWeek = daily
    .filter((d) => Date.parse(`${d.date}T00:00:00Z`) >= sevenDayThreshold)
    .reduce((acc, d) => acc + d.count, 0);

  ok(res, {
    totals: {
      allTimeTokens: totalTokens,
      last30Days: totalRequests30d,
      last30DaysTokens: tokens30d,
      requestsThisWeek,
      topFeature,
    },
    daily,
    featureBreakdown: breakdown,
  });
}

export async function history(req: Request, res: Response): Promise<void> {
  const { limit, offset } = req.query as unknown as z.infer<typeof historyQuerySchema>;
  const rows = await Requests.listByUser(req.user!.id, limit, offset);
  ok(res, {
    items: rows.map((r) => ({
      id: r.id,
      feature: r.feature_type,
      language: r.language,
      tokensUsed: r.tokens_used,
      cached: r.cached,
      s3Key: r.s3_output_key,
      createdAt: r.created_at,
    })),
    limit,
    offset,
  });
}

export async function historyDetail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const row = await Requests.findByIdForUser(id, req.user!.id);
  if (!row || !row.s3_output_key) {
    fail(res, 404, 'history.not_found', 'History entry not found');
    return;
  }
  try {
    const archived = await fetchArchived(row.s3_output_key);
    ok(res, {
      id: row.id,
      feature: row.feature_type,
      language: row.language,
      tokensUsed: row.tokens_used,
      cached: row.cached,
      createdAt: row.created_at,
      input: archived.input,
      output: archived.output,
    });
  } catch {
    fail(res, 502, 'history.archive_unavailable', 'Archive fetch failed');
  }
}
