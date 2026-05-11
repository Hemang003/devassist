/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Augment Express's Request so authenticated middleware can attach the user
 * without each handler casting through `any`.
 */

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
    requestId?: string;
  }
}
