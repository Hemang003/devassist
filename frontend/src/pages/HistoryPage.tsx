/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchHistory } from '@/api/dashboard';

export function HistoryPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['history', 50, 0], queryFn: () => fetchHistory(50, 0) });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-ink-400 mt-1">Every request you've made. Click through for the full transcript.</p>
      </header>

      {isLoading && <div className="text-ink-400">Loading…</div>}
      {error && <div className="severity-critical p-4 rounded-lg">Failed to load history.</div>}

      {data && (
        <div className="card divide-y divide-white/5 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wider text-ink-500">
            <div className="col-span-3">When</div>
            <div className="col-span-3">Feature</div>
            <div className="col-span-2">Language</div>
            <div className="col-span-2">Tokens</div>
            <div className="col-span-2 text-right">Open</div>
          </div>
          {data.items.length === 0 && (
            <div className="px-4 py-6 text-ink-400">No requests yet — try one of the tools to get started.</div>
          )}
          {data.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm">
              <div className="col-span-3 text-ink-300">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="col-span-3">
                <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-200 text-xs">
                  {item.feature}
                </span>
                {item.cached && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">cached</span>
                )}
              </div>
              <div className="col-span-2 text-ink-300">{item.language ?? '—'}</div>
              <div className="col-span-2 text-ink-300">{item.tokensUsed.toLocaleString()}</div>
              <div className="col-span-2 text-right">
                <Link to={`/history/${item.id}`} className="text-brand-300 hover:text-brand-200">
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
