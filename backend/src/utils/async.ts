/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Tiny wrapper to forward async handler rejections into Express's error
 * middleware. Saves us from repeating try/catch in every controller.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncRoute(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
