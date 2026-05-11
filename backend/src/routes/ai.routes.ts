/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { Router } from 'express';
import {
  explain,
  explainSchema,
  fixBug,
  fixBugSchema,
  generateTests,
  generateTestsSchema,
  refactor,
  refactorSchema,
  review,
  reviewSchema,
} from '@/controllers/ai.controller';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { aiRateLimiter } from '@/middleware/rateLimit';
import { asyncRoute } from '@/utils/async';

const router = Router();

router.use(requireAuth);
router.use(aiRateLimiter);

router.post('/review', validate(reviewSchema), asyncRoute(review));
router.post('/explain', validate(explainSchema), asyncRoute(explain));
router.post('/generate-tests', validate(generateTestsSchema), asyncRoute(generateTests));
router.post('/fix-bug', validate(fixBugSchema), asyncRoute(fixBug));
router.post('/refactor', validate(refactorSchema), asyncRoute(refactor));

export { router as aiRouter };
