/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { Router } from 'express';
import { health, status } from '@/controllers/health.controller';
import { asyncRoute } from '@/utils/async';

const router = Router();
router.get('/health', health);
router.get('/status', asyncRoute(status));
export { router as healthRouter };
