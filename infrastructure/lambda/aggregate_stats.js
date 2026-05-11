/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Nightly aggregation Lambda. Triggered by an EventBridge cron rule
 * (rate(1 day) at 03:15 UTC). Walks every active user in RDS, sums their
 * per-feature usage for the previous calendar day, upserts a row into the
 * `usage_stats` table, and on Sundays sends a weekly summary via SES.
 *
 * Runtime: nodejs20.x
 * Permissions: rds-db connect (or VPC + DB creds), ses:SendEmail, logs:*
 *
 * Environment:
 *   DATABASE_URL          RDS connection string (with sslmode=require)
 *   SES_FROM_EMAIL        Verified SES "from" address
 *   AWS_REGION            (provided automatically)
 *   SEND_WEEKLY           "true"|"false" — toggle the weekly digest
 */

'use strict';

const { Client } = require('pg');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const targetDate = event?.date ? new Date(event.date) : yesterday();
  const isoDate = targetDate.toISOString().slice(0, 10);

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  let processed = 0;
  let summariesSent = 0;
  try {
    const users = await db.query(
      'SELECT id, email FROM users WHERE created_at <= $1',
      [endOfDay(targetDate)],
    );

    for (const user of users.rows) {
      const breakdown = await db.query(
        `SELECT feature_type, COUNT(*)::INT AS count, COALESCE(SUM(tokens_used), 0)::INT AS tokens
         FROM requests
         WHERE user_id = $1
           AND created_at >= $2 AND created_at < $3
         GROUP BY feature_type`,
        [user.id, startOfDay(targetDate), endOfDay(targetDate)],
      );

      const featureBreakdown = {};
      let requestCount = 0;
      let tokensUsed = 0;
      for (const row of breakdown.rows) {
        featureBreakdown[row.feature_type] = row.count;
        requestCount += row.count;
        tokensUsed += row.tokens;
      }

      await db.query(
        `INSERT INTO usage_stats (user_id, date, request_count, tokens_used, feature_breakdown)
         VALUES ($1, $2, $3, $4, $5::JSONB)
         ON CONFLICT (user_id, date) DO UPDATE SET
           request_count     = EXCLUDED.request_count,
           tokens_used       = EXCLUDED.tokens_used,
           feature_breakdown = EXCLUDED.feature_breakdown`,
        [user.id, isoDate, requestCount, tokensUsed, JSON.stringify(featureBreakdown)],
      );
      processed += 1;

      // Weekly digest fires on Sunday for the calendar week that just closed.
      const isSunday = targetDate.getUTCDay() === 0;
      if (isSunday && process.env.SEND_WEEKLY !== 'false') {
        const sent = await sendWeeklyDigest(db, ses, user, targetDate);
        if (sent) summariesSent += 1;
      }
    }
  } finally {
    await db.end();
  }

  return { processedUsers: processed, summariesSent, date: isoDate };
};

async function sendWeeklyDigest(db, sesClient, user, targetDate) {
  const start = startOfWeek(targetDate);
  const end = endOfDay(targetDate);

  const totals = await db.query(
    `SELECT COALESCE(SUM(request_count), 0)::INT AS requests,
            COALESCE(SUM(tokens_used), 0)::INT  AS tokens,
            COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) AS breakdown
       FROM (
         SELECT request_count, tokens_used,
                jsonb_each_text(feature_breakdown) AS row
         FROM usage_stats
         WHERE user_id = $1 AND date >= $2 AND date <= $3
       ) AS u
       CROSS JOIN LATERAL (SELECT (u.row).key AS k, (u.row).value::int AS v) keys`,
    [user.id, start.toISOString().slice(0, 10), targetDate.toISOString().slice(0, 10)],
  );

  const row = totals.rows[0];
  if (!row || row.requests === 0) return false;

  const breakdownText = Object.entries(row.breakdown)
    .map(([feature, count]) => `  • ${feature}: ${count}`)
    .join('\n');
  const topFeature = Object.entries(row.breakdown).sort(([, a], [, b]) => Number(b) - Number(a))[0]?.[0] ?? 'n/a';

  const subject = 'Your DevAssist weekly summary';
  const text =
    `Hi ${user.email},\n\n` +
    `Your DevAssist activity for the week of ${start.toISOString().slice(0, 10)}:\n\n` +
    `Total requests: ${row.requests}\n` +
    `Total tokens:   ${row.tokens}\n` +
    `Top feature:    ${topFeature}\n\n` +
    `By feature:\n${breakdownText}\n\n` +
    `— DevAssist`;
  const html = `
    <div style="font-family:-apple-system,sans-serif;line-height:1.5;color:#1f2937;">
      <h2 style="margin-top:0;">Weekly DevAssist summary</h2>
      <p>Hi ${escapeHtml(user.email)},</p>
      <ul>
        <li>Total requests: <strong>${row.requests}</strong></li>
        <li>Total tokens: <strong>${row.tokens}</strong></li>
        <li>Top feature: <strong>${escapeHtml(topFeature)}</strong></li>
      </ul>
      <pre style="font-family:Menlo,monospace;background:#f8fafc;padding:8px 12px;border-radius:6px;">
${escapeHtml(breakdownText)}
      </pre>
      <p>— DevAssist</p>
    </div>`;

  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [user.email] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    }),
  );
  return true;
}

function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
