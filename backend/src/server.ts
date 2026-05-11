/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Production entry point. Boots the HTTP server, attaches websockets, wires
 * graceful shutdown to release Postgres / Redis cleanly.
 */

import http from 'node:http';
import { env } from '@/config/env';
import { createApp } from './app';
import { attachWebsockets } from './realtime/socket';
import { logger } from '@/services/logger.service';
import { shutdown as shutdownDb } from '@/db';
import { shutdownCache } from '@/services/cache.service';

const app = createApp();
const server = http.createServer(app);
const io = attachWebsockets(server);

server.listen(env.PORT, () => {
  logger.info('devassist api listening', { port: env.PORT, env: env.NODE_ENV });
});

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown signal received', { signal });
  io.close();
  server.close(async (err) => {
    if (err) logger.error('http server close error', { message: err.message });
    try {
      await Promise.all([shutdownDb(), shutdownCache()]);
    } catch (e) {
      logger.error('dependency close error', { message: (e as Error).message });
    } finally {
      process.exit(0);
    }
  });

  // If anything stalls, force exit so systemd doesn't sit on a zombie.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});
