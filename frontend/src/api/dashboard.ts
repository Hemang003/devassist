/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { api } from './client';
import type { ApiResponse, DashboardStats, HistoryDetail, HistoryItem } from '@/types/api';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  if (!res.data.success) throw new Error(res.data.error.message);
  return res.data.data;
}

export async function fetchHistory(limit = 25, offset = 0): Promise<{ items: HistoryItem[] }> {
  const res = await api.get<ApiResponse<{ items: HistoryItem[]; limit: number; offset: number }>>(
    '/dashboard/history',
    { params: { limit, offset } },
  );
  if (!res.data.success) throw new Error(res.data.error.message);
  return res.data.data;
}

export async function fetchHistoryDetail(id: string): Promise<HistoryDetail> {
  const res = await api.get<ApiResponse<HistoryDetail>>(`/history/${id}`);
  if (!res.data.success) throw new Error(res.data.error.message);
  return res.data.data;
}
