/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Attach a per-request id, log start/finish, expose timing.
 */

import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '@/services/logger.service';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const id = req.header('x-request-id') ?? randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
    logger.info('request', {
      request_id: id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
      user_id: req.user?.id,
    });
  });

  next();
}
