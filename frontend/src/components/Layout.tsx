/*
 * Copyright (c) 2026 Hemang Parmar
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/review', label: 'Review' },
  { to: '/explain', label: 'Explain' },
  { to: '/tests', label: 'Tests' },
  { to: '/fix', label: 'Fix' },
  { to: '/refactor', label: 'Refactor' },
  { to: '/history', label: 'History' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-ink-900/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 grid place-items-center font-bold">D</div>
            <div className="font-semibold tracking-tight">DevAssist</div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-1.5 rounded-md text-sm transition',
                    isActive ? 'bg-brand-500/20 text-white' : 'text-ink-400 hover:text-white hover:bg-white/5',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && <div className="text-sm text-ink-400 hidden sm:block">{user.email}</div>}
            <button onClick={handleLogout} className="btn-ghost text-sm py-1.5 px-3">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-white/5 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Hemang Parmar
      </footer>
    </div>
  );
}
