/*
 * Copyright (c) 2026 Hemang Parmar
 */

export type Feature = 'review' | 'explain' | 'generate-tests' | 'fix-bug' | 'refactor';

export const FEATURES: readonly Feature[] = [
  'review',
  'explain',
  'generate-tests',
  'fix-bug',
  'refactor',
] as const;

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  email_verified: boolean;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

export interface RequestRow {
  id: string;
  user_id: string;
  feature_type: Feature;
  language: string | null;
  input_hash: string;
  s3_output_key: string | null;
  tokens_used: number;
  cached: boolean;
  created_at: Date;
}

export interface UsageRow {
  id: string;
  user_id: string;
  date: Date;
  request_count: number;
  tokens_used: number;
  feature_breakdown: Record<string, number>;
}

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
