'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

export function Navbar() {
  const { data, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const homePath = data?.role === 'coach' ? '/coach/tournaments' : '/student/tournaments';
  const homeLabel = data?.role === 'coach' ? 'Tournaments' : 'Play';

  const logout = async () => {
    setAccountError('');
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.post('/auth/logout', {});
      queryClient.clear();
      disconnectSocket();
      setMenuOpen(false);
      router.replace('/login');
    } catch {
      setAccountError('Could not log out. Please try again.');
      setLoggingOut(false);
    }
  };

  const isActive = pathname === homePath || pathname.startsWith(`${homePath}/`);
  useEffect(() => setDarkMode(document.documentElement.dataset.theme === 'dark'), []);
  const toggleTheme = () => {
    const next = !darkMode;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { window.localStorage.setItem('koc-theme', next ? 'dark' : 'light'); } catch { /* Theme remains active until refresh. */ }
    setDarkMode(next);
  };

  return (
    <header className="site-header">
      <div className="site-nav">
        <Link href={data ? homePath : '/'} className="brand-lockup" aria-label="Kingdom of Chess home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="brand-wordmark"><strong>KINGDOM</strong><span>OF CHESS</span></span>
        </Link>

        <nav className={`primary-nav ${menuOpen ? 'primary-nav-open' : ''}`} aria-label="Main navigation">
          {data && <Link href={homePath} onClick={() => setMenuOpen(false)} className={isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="nav-link-icon" aria-hidden="true">♟</span>{homeLabel}
          </Link>}
        </nav>

        <div className="nav-account">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
            <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span><span className="theme-toggle-label">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          {isLoading ? <span className="nav-loading" aria-label="Loading account" /> : data ? <>
            <span className="account-avatar" aria-hidden="true">{data.name?.slice(0, 1).toUpperCase()}</span>
            <span className="account-copy"><strong>{data.name}</strong><small>{data.role === 'coach' ? 'Coach account' : 'Student account'}</small></span>
            <button type="button" onClick={logout} className="logout-button" disabled={loggingOut}>{loggingOut ? 'Logging out…' : 'Log out'}</button>
          </> : <Link href="/login" className="nav-login">Log in <span aria-hidden="true">→</span></Link>}
          {data && <button type="button" className="mobile-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span />
          </button>}
        </div>
        {accountError && <span className="nav-error" role="alert">{accountError}</span>}
      </div>
    </header>
  );
}
