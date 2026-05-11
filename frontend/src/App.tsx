/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { ExplainPage } from '@/pages/ExplainPage';
import { TestsPage } from '@/pages/TestsPage';
import { FixPage } from '@/pages/FixPage';
import { RefactorPage } from '@/pages/RefactorPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HistoryDetailPage } from '@/pages/HistoryDetailPage';
import type { ReactElement } from 'react';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-ink-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="explain" element={<ExplainPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="fix" element={<FixPage />} />
        <Route path="refactor" element={<RefactorPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<HistoryDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
