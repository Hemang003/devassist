/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { fetchHistoryDetail } from '@/api/dashboard';

export function HistoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['history', id],
    queryFn: () => fetchHistoryDetail(id),
    enabled: id.length > 0,
  });

  if (isLoading) return <div className="text-ink-400">Loading…</div>;
  if (error || !data) return <div className="severity-critical p-4 rounded-lg">Could not load this entry.</div>;

  return (
    <div className="space-y-6">
      <Link to="/history" className="text-sm text-brand-300 hover:text-brand-200">← Back to history</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{data.feature}</h1>
        <div className="text-ink-400 text-sm">
          {new Date(data.createdAt).toLocaleString()} · {data.language ?? '—'} · {data.tokensUsed} tokens
          {data.cached && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">cached</span>}
        </div>
      </header>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Input</h2>
        <pre className="font-mono text-sm whitespace-pre-wrap break-words bg-ink-900 p-4 rounded-lg max-h-[420px] overflow-auto">
          {data.input}
        </pre>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Output</h2>
        <pre className="font-mono text-sm whitespace-pre-wrap break-words bg-ink-900 p-4 rounded-lg max-h-[640px] overflow-auto">
          {data.output}
        </pre>
      </section>
    </div>
  );
}
