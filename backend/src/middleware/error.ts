/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Final error handler. Anything that escapes a route lands here.
 */

import type { NextFunction, Request, Response } from 'express';
import { logger } from '@/services/logger.service';
import { fail } from '@/utils/api';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(_req: Request, res: Response): void {
  fail(res, 404, 'route.not_found', 'Not Found');
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // express requires the 4-arg signature even though we don't call next()
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    logger.warn('http error', {
      request_id: req.requestId,
      status: err.status,
      code: err.code,
      message: err.message,
    });
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('unhandled error', {
    request_id: req.requestId,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });
  fail(res, 500, 'server.error', 'Internal server error');
}
