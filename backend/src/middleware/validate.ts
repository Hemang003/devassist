/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Generic Zod request validator. Use one validator per route; we get typed
 * bodies for free downstream.
 */

import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject, ZodError, ZodSchema } from 'zod';
import { fail } from '@/utils/api';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      fail(res, 400, 'validation.failed', 'Request validation failed', formatZodError(result.error));
      return;
    }
    // Replace the original payload with the parsed/typed version so downstream
    // handlers see coerced values (e.g. `limit` as number, not string).
    (req as Record<Source, unknown>)[source] = result.data;
    next();
  };
}

function formatZodError(err: ZodError): Array<{ path: string; message: string }> {
  return err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
}

export type Validated<S extends AnyZodObject> = ReturnType<S['parse']>;
