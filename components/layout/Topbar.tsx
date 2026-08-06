'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/Logo';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { account, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('teachalike_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    window.localStorage.setItem('teachalike_theme', nextDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextDarkMode);
    document.documentElement.style.colorScheme = nextDarkMode ? 'dark' : 'light';
  }

  function requestExit() {
    setMenuOpen(false);
    void logout();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex w-full min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-white/85 px-2.5 py-2.5 text-brand-900 backdrop-blur sm:px-5 sm:py-3 lg:px-8">
      <div className="flex min-w-0 items-center gap-1.5 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="soft-inset grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-900 transition-transform hover:bg-white active:scale-90"
          aria-label="Open menu"
        >
          <Menu className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <Logo compact />
      </div>

      <div className="hidden lg:block" aria-hidden="true" />

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="soft-inset grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg transition hover:bg-white active:scale-90"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="soft-inset flex max-w-[calc(100vw-8.5rem)] items-center gap-1.5 rounded-full px-1.5 py-1.5 text-left text-sm font-medium text-brand-900 transition hover:bg-white active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-brand-400 min-[380px]:gap-2 min-[380px]:px-2 sm:max-w-none sm:gap-3 sm:px-3 sm:py-2"
          aria-expanded={menuOpen}
          aria-label="Open profile menu"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-400 bg-brand-600 text-base font-bold text-white shadow-inner sm:h-10 sm:w-10">
            {account?.profile_image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={account.profile_image_url} alt="" className="h-full w-full object-cover" />
              </>
            ) : account?.name?.[0]?.toUpperCase() || '?'}
          </span>
          <span className="hidden min-w-0 flex-col min-[380px]:flex">
            <span className="max-w-[145px] truncate font-semibold leading-tight">{account?.name || 'My profile'}</span>
            <span className="mt-0.5 text-xs capitalize text-cyan-100">{account?.role || 'Account'}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-[min(14rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-surface p-2 shadow-card motion-safe:animate-[fade-slide-in_.15s_ease-out]">
              <div className="mb-1 border-b border-border px-3 py-2">
                <p className="truncate text-sm font-semibold text-brand-900">{account?.name || 'My profile'}</p>
                <p className="mt-0.5 text-xs capitalize text-muted">{account?.role || 'Account'}</p>
              </div>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-900 transition-colors hover:bg-bg"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                My account
              </Link>
              <button
                type="button"
                onClick={requestExit}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Exit app
              </button>
            </div>
          </>
        )}
        </div>
      </div>
      </header>
    </>
  );
}
