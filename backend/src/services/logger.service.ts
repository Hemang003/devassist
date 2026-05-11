/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Structured JSON logging via Winston. Console transport for local dev,
 * CloudWatch transport when AWS credentials are present so production logs
 * land in the right log group without code changes.
 */

import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { env } from '@/config/env';

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp as string} ${level} ${message as string}${extras}`;
            }),
          )
        : baseFormat,
  }),
];

// Only attempt CloudWatch shipping if creds and a region are explicitly set.
// Lets `npm test` and local-only runs work without an AWS account.
if (env.NODE_ENV === 'production' && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  transports.push(
    new WinstonCloudWatch({
      logGroupName: env.CLOUDWATCH_LOG_GROUP,
      logStreamName: `${env.CLOUDWATCH_LOG_STREAM}-${process.pid}`,
      awsRegion: env.AWS_REGION,
      awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
      awsSecretKey: env.AWS_SECRET_ACCESS_KEY,
      jsonMessage: true,
      messageFormatter: ({ level, message, ...meta }) =>
        JSON.stringify({ level, message, ...meta }),
      retentionInDays: 30,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'devassist-api', env: env.NODE_ENV },
  format: baseFormat,
  transports,
  exitOnError: false,
});

export type Logger = typeof logger;
