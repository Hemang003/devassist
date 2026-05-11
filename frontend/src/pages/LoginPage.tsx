/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="card p-8 w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to DevAssist</h1>
          <p className="text-sm text-ink-400 mt-1">Welcome back.</p>
        </div>
        {error && <div className="severity-critical rounded-lg p-3 text-sm">{error}</div>}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="text-sm text-ink-400 text-center">
          New here?{' '}
          <Link to="/register" className="text-brand-300 hover:text-brand-200">
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}
