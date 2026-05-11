/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * S3 archive for full request/response payloads. Postgres holds the metadata,
 * S3 holds the heavy text blobs — keeps row sizes small and gives us a cheap
 * audit trail.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { env } from '@/config/env';
import { logger } from './logger.service';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export interface ArchivePayload {
  feature: string;
  language: string | null;
  input: string;
  output: string;
  tokensUsed: number;
  cached: boolean;
  createdAt: string;
}

export function buildHistoryKey(userId: string, requestId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `history/${userId}/${date}/${requestId}.json`;
}

export async function archiveOutput(key: string, payload: ArchivePayload): Promise<string> {
  const params: PutObjectCommandInput = {
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(payload),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256',
  };
  await s3.send(new PutObjectCommand(params));
  logger.debug('archived output to s3', { key, bytes: params.Body?.toString().length });
  return key;
}

export async function fetchArchived(key: string): Promise<ArchivePayload> {
  const result = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  const body = await streamToString(result.Body as Readable);
  return JSON.parse(body) as ArchivePayload;
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}
