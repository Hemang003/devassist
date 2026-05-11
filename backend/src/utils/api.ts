/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Tiny helpers for wrapping responses in our standard envelope.
 */

import type { Response } from 'express';
import type { ApiFailure, ApiSuccess } from '@/types/domain';

export function ok<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(body);
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiFailure = {
    success: false,
    data: null,
    error: details === undefined ? { code, message } : { code, message, details },
    timestamp: new Date().toISOString(),
  };
  return res.status(status).json(body);
}
