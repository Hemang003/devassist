/*
 * Copyright (c) 2024 Hemang Parmar
 */

import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import { fetchStats } from '@/api/dashboard';

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: fetchStats });

  if (isLoading) return <div className="text-ink-400 py-20 text-center">Loading dashboard…</div>;
  if (error) return <div className="severity-critical p-4 rounded-lg">Failed to load stats.</div>;
  if (!data) return null;

  const breakdownRows = Object.entries(data.featureBreakdown).map(([name, count]) => ({
    name: prettyFeature(name),
    count,
  }));

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-ink-100 to-ink-300 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-ink-400 mt-1">Your activity over the last 30 days.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink-300 border border-white/10 rounded-full px-3 py-1 bg-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={<IconBolt />}
          accent="from-brand-500/40 to-brand-500/0"
          ring="ring-brand-500/20"
          label="Requests (30d)"
          value={data.totals.last30Days.toLocaleString()}
        />
        <Stat
          icon={<IconStack />}
          accent="from-emerald-400/40 to-emerald-400/0"
          ring="ring-emerald-400/20"
          label="Tokens (30d)"
          value={data.totals.last30DaysTokens.toLocaleString()}
        />
        <Stat
          icon={<IconCalendar />}
          accent="from-amber-400/40 to-amber-400/0"
          ring="ring-amber-400/20"
          label="This week"
          value={data.totals.requestsThisWeek.toLocaleString()}
        />
        <Stat
          icon={<IconStar />}
          accent="from-violet-400/40 to-violet-400/0"
          ring="ring-violet-400/20"
          label="Top feature"
          value={data.totals.topFeature ? prettyFeature(data.totals.topFeature) : '—'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Activity" subtitle="last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a59f5" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#3a59f5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ stroke: '#3a59f5', strokeWidth: 1, strokeOpacity: 0.4 }}
                labelStyle={{ color: '#cbd5e1', fontWeight: 500 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6580ff"
                strokeWidth={2.5}
                fill="url(#activityFill)"
                activeDot={{ r: 5, fill: '#fff', stroke: '#3a59f5', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Breakdown by feature" subtitle="all time">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={breakdownRows}
              barCategoryGap="35%"
              margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
            >
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#90a8ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#3a59f5" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: 'rgba(58, 89, 245, 0.08)' }}
                labelStyle={{ color: '#cbd5e1', fontWeight: 500 }}
              />
              <Bar dataKey="count" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

const chartTooltipStyle = {
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 10,
  fontSize: 12,
  padding: '8px 12px',
  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
};

function Stat({
  icon,
  label,
  value,
  accent,
  ring,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  ring: string;
}) {
  return (
    <div
      className={`card relative overflow-hidden p-5 transition-all duration-300
                  hover:-translate-y-0.5 hover:border-white/15 hover:shadow-2xl group`}
    >
      <div
        className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${accent}
                    blur-3xl pointer-events-none opacity-70 group-hover:opacity-100 transition`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-ink-400">
            {label}
          </div>
          <div
            className={`w-9 h-9 rounded-xl bg-white/5 ring-1 ${ring} grid place-items-center text-white/80`}
          >
            {icon}
          </div>
        </div>
        <div className="text-3xl font-bold mt-3 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="card p-6 transition hover:border-white/15">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <span className="text-[11px] uppercase tracking-widest text-ink-500">{subtitle}</span>
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function prettyFeature(slug: string): string {
  switch (slug) {
    case 'review':
      return 'Review';
    case 'explain':
      return 'Explain';
    case 'generate-tests':
      return 'Tests';
    case 'fix-bug':
      return 'Fix';
    case 'refactor':
      return 'Refactor';
    default:
      return slug;
  }
}

function IconBolt() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconStack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
