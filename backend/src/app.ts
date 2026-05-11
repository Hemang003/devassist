/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Express application factory. Kept separate from `server.ts` so the tests
 * can construct the app without binding a port.
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from '@/config/env';
import { requestContext } from '@/middleware/requestContext';
import { errorHandler, notFound } from '@/middleware/error';
import { authRouter, userRouter } from '@/routes/auth.routes';
import { aiRouter } from '@/routes/ai.routes';
import { dashboardRouter, historyRouter } from '@/routes/dashboard.routes';
import { healthRouter } from '@/routes/health.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // SSE needs to flush early; helmet's default CSP is fine for our use.
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(compression());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestContext);

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/history', historyRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
