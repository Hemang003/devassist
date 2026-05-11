/*
 * Copyright (c) 2026 Hemang Parmar
 *
 * Transactional email via AWS SES. Two flows for now: signup welcome and the
 * weekly digest fired by the nightly aggregation Lambda.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '@/config/env';
import { logger } from './logger.service';

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const Templates = {
  welcome(email: string): EmailTemplate {
    const subject = 'Welcome to DevAssist';
    const text =
      `Hi,\n\n` +
      `Thanks for joining DevAssist. Your account (${email}) is ready — sign in and ` +
      `try the Code Review Assistant on your next pull request.\n\n` +
      `If you ever need a hand, just reply to this email.\n\n` +
      `— DevAssist`;
    const html = `
      <div style="font-family: -apple-system, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-top:0;">Welcome to DevAssist</h2>
        <p>Hi,</p>
        <p>
          Thanks for joining DevAssist. Your account (<strong>${escapeHtml(email)}</strong>) is
          ready &mdash; sign in and try the Code Review Assistant on your next pull request.
        </p>
        <p>If you ever need a hand, just reply to this email.</p>
        <p>&mdash; DevAssist</p>
      </div>
    `;
    return { subject, html, text };
  },

  weeklySummary(email: string, summary: WeeklySummary): EmailTemplate {
    const subject = 'Your DevAssist weekly summary';
    const breakdown = Object.entries(summary.featureBreakdown)
      .map(([feature, count]) => `  • ${feature}: ${count}`)
      .join('\n');
    const text =
      `Hi ${email},\n\n` +
      `Here's your DevAssist activity for the week of ${summary.weekStart}:\n\n` +
      `Total requests: ${summary.totalRequests}\n` +
      `Total tokens:   ${summary.totalTokens}\n` +
      `Top feature:    ${summary.topFeature ?? 'n/a'}\n\n` +
      `By feature:\n${breakdown || '  (no activity)'}\n\n` +
      `— DevAssist`;
    const breakdownRows = Object.entries(summary.featureBreakdown)
      .map(
        ([feature, count]) =>
          `<tr><td style="padding:4px 12px;">${escapeHtml(feature)}</td>` +
          `<td style="padding:4px 12px; text-align:right;">${count}</td></tr>`,
      )
      .join('');
    const html = `
      <div style="font-family: -apple-system, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-top:0;">Weekly DevAssist summary</h2>
        <p>Hi ${escapeHtml(email)},</p>
        <p>Here's your activity for the week of <strong>${escapeHtml(summary.weekStart)}</strong>:</p>
        <ul>
          <li>Total requests: <strong>${summary.totalRequests}</strong></li>
          <li>Total tokens: <strong>${summary.totalTokens}</strong></li>
          <li>Top feature: <strong>${escapeHtml(summary.topFeature ?? 'n/a')}</strong></li>
        </ul>
        <table style="border-collapse: collapse; margin-top: 12px;">
          ${breakdownRows || '<tr><td>No activity this week</td></tr>'}
        </table>
        <p style="margin-top: 24px;">&mdash; DevAssist</p>
      </div>
    `;
    return { subject, html, text };
  },
};

export interface WeeklySummary {
  weekStart: string;
  totalRequests: number;
  totalTokens: number;
  topFeature: string | null;
  featureBreakdown: Record<string, number>;
}

export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  if (env.NODE_ENV === 'test') {
    logger.debug('email send suppressed (test env)', { to, subject: template.subject });
    return;
  }
  try {
    await ses.send(
      new SendEmailCommand({
        Source: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: template.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: template.html, Charset: 'UTF-8' },
            Text: { Data: template.text, Charset: 'UTF-8' },
          },
        },
      }),
    );
    logger.info('email sent', { to, subject: template.subject });
  } catch (err) {
    // Email is best-effort; don't fail the originating request because SES blipped.
    logger.error('email send failed', { to, subject: template.subject, message: (err as Error).message });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
