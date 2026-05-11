/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { Router } from 'express';
import {
  history,
  historyDetail,
  historyQuerySchema,
  stats,
} from '@/controllers/dashboard.controller';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { asyncRoute } from '@/utils/async';

const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get('/stats', asyncRoute(stats));
dashboardRouter.get('/history', validate(historyQuerySchema, 'query'), asyncRoute(history));

const historyRouter = Router();
historyRouter.use(requireAuth);
historyRouter.get('/:id', asyncRoute(historyDetail));

export { dashboardRouter, historyRouter };
