/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { Router } from 'express';
import {
  login,
  loginSchema,
  logout,
  profile,
  refresh,
  refreshSchema,
  register,
  registerSchema,
} from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate';
import { requireAuth } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimit';
import { asyncRoute } from '@/utils/async';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), asyncRoute(register));
router.post('/login', authRateLimiter, validate(loginSchema), asyncRoute(login));
router.post('/refresh', validate(refreshSchema), asyncRoute(refresh));
router.post('/logout', validate(refreshSchema), asyncRoute(logout));

const userRouter = Router();
userRouter.get('/profile', requireAuth, asyncRoute(profile));

export { router as authRouter, userRouter };
