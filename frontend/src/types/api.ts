/*
 * Copyright (c) 2024 Hemang Parmar
 */

export type Feature = 'review' | 'explain' | 'generate-tests' | 'fix-bug' | 'refactor';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  timestamp: string;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: { code: string; message: string; details?: unknown };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface HistoryItem {
  id: string;
  feature: Feature;
  language: string | null;
  tokensUsed: number;
  cached: boolean;
  s3Key: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totals: {
    allTimeTokens: number;
    last30Days: number;
    last30DaysTokens: number;
    requestsThisWeek: number;
    topFeature: Feature | null;
  };
  daily: Array<{ date: string; count: number; tokens: number }>;
  featureBreakdown: Record<string, number>;
}

export interface HistoryDetail {
  id: string;
  feature: Feature;
  language: string | null;
  tokensUsed: number;
  cached: boolean;
  createdAt: string;
  input: string;
  output: string;
}
