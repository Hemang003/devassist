/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Socket.io is used for ambient real-time concerns: in-app notifications
 * (e.g. "your refactor finished"), live dashboard updates when a long-running
 * request completes, and connection-presence indicators on the frontend.
 *
 * Per-feature streaming uses SSE on the HTTP routes — websockets are
 * deliberately not on the hot AI-output path because SSE is simpler over
 * load balancers and reverse proxies.
 */

import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import { env } from '@/config/env';
import { verifyAccessToken } from '@/services/auth.service';
import { dropSession, trackSession } from '@/services/cache.service';
import { logger } from '@/services/logger.service';

export function attachWebsockets(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: env.FRONTEND_ORIGIN, credentials: true },
    path: '/ws',
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    await trackSession(userId, socket.id);
    socket.join(`user:${userId}`);
    logger.debug('socket connected', { user_id: userId, socket_id: socket.id });

    socket.on('disconnect', async () => {
      await dropSession(userId, socket.id);
      logger.debug('socket disconnected', { user_id: userId, socket_id: socket.id });
    });
  });

  return io;
}
