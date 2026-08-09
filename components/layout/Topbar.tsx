'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Lock, LogOut, Menu, Moon, Sun, UserRound, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/Logo';
import { useActiveChild } from '@/lib/active-child-context';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Child } from '@/lib/types';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { account, logout } = useAuth();
  const { children, activeChild, activateChild, lockChild } = useActiveChild();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [childMenuOpen, setChildMenuOpen] = useState(false);
  const [pendingChild, setPendingChild] = useState<Child|null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string|null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('teachalike_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setChildMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
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

  function chooseChild(child: Child) {
    setPendingChild(child);
    setPin('');
    setPinError(null);
    setChildMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex w-full min-w-0 shrink-0 items-center justify-between gap-1.5 border-b border-border/60 bg-white/90 px-2 py-2 text-brand-900 backdrop-blur sm:gap-2 sm:px-5 sm:py-3 lg:px-8">
      <div className="flex min-w-0 items-center gap-1 sm:gap-1.5 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="soft-inset grid h-11 w-11 shrink-0 place-items-center rounded-xl text-brand-900 transition-transform hover:bg-white active:scale-90"
          aria-label="Open menu"
        >
          <Menu className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="hidden min-[390px]:block"><Logo compact /></span>
      </div>

      <div className="hidden lg:block" aria-hidden="true" />

      <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="soft-inset hidden h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg transition hover:bg-white active:scale-90 min-[460px]:grid"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        {account?.role === 'parent' && <div className="relative min-w-0"><button type="button" onClick={()=>setChildMenuOpen(v=>!v)} className="soft-inset flex min-h-11 min-w-11 max-w-[8.5rem] items-center gap-1.5 rounded-full px-1.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 sm:max-w-[11rem] sm:gap-2 sm:px-2" aria-expanded={childMenuOpen} aria-haspopup="menu" aria-label={activeChild ? `Playing as ${activeChild.name}, verified` : 'Choose child'}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800 sm:h-9 sm:w-9">{activeChild?.name?.[0]?.toUpperCase() || '＋'}</span><span className="min-w-0 text-left"><span className="hidden text-[10px] font-bold uppercase leading-none text-muted sm:block">{activeChild?'Playing as':'Child mode'}</span><span className="block max-w-[4.5rem] truncate text-xs font-bold sm:max-w-24 sm:text-sm">{activeChild?.name || 'Choose child'}</span></span>{activeChild && <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-success min-[520px]:block" aria-label="Verified" />}<ChevronDown className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" /></button>{childMenuOpen&&<><button type="button" className="fixed inset-0 z-30 bg-brand-900/35 sm:bg-transparent" onClick={()=>setChildMenuOpen(false)} aria-label="Close child menu"/><div className="fixed inset-x-0 bottom-0 z-40 max-h-[min(80dvh,34rem)] overflow-y-auto rounded-t-3xl border border-border bg-surface p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:max-h-[28rem] sm:w-80 sm:rounded-2xl sm:p-2" role="menu" aria-label="Choose active child"><div className="mb-2 flex items-center justify-between px-2 py-1 sm:hidden"><p className="font-bold text-brand-900">Choose a child</p><button type="button" onClick={()=>setChildMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-bg" aria-label="Close child menu"><X className="h-5 w-5" /></button></div>{children.length?children.map(child=><button key={child.id} type="button" role="menuitemradio" aria-checked={activeChild?.id===child.id} onClick={()=>chooseChild(child)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-bg"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold">{child.name[0]}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{child.name}</span><span className="block text-xs text-muted">{child.reading_level} · {child.has_pin?'PIN required':'PIN not set'}</span></span>{activeChild?.id===child.id&&<CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Selected" />}</button>):<p className="p-3 text-sm text-muted">No children yet.</p>}<Link href="/children" onClick={()=>setChildMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-bold text-brand-700 hover:bg-bg">{children.length?'Manage children':'Add child'}</Link>{activeChild&&<button type="button" onClick={()=>{void lockChild();setChildMenuOpen(false);}} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-danger hover:bg-danger/5"><Lock className="h-4 w-4"/>Lock child mode</button>}</div></>}</div>}
        <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="soft-inset flex min-h-11 min-w-11 max-w-[4rem] items-center gap-1 rounded-full px-1.5 py-1 text-left text-sm font-medium text-brand-900 transition hover:bg-white active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-brand-400 sm:max-w-none sm:gap-3 sm:px-3 sm:py-2"
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
          <span className="hidden min-w-0 flex-col md:flex">
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
      <Modal open={Boolean(pendingChild)} onClose={() => setPendingChild(null)} title={pendingChild ? `Open ${pendingChild.name}'s child mode` : ''}>
        {pendingChild && !pendingChild.has_pin ? (
          <div className="space-y-4">
            <Alert>This child needs a six-digit PIN before activities can begin.</Alert>
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setPendingChild(null)}>Cancel</Button>
              <Link href={`/children/${pendingChild.id}`} onClick={() => setPendingChild(null)} className="btn-primary">Set a PIN</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (!pendingChild) return;
            if (!/^\d{6}$/.test(pin)) { setPinError('Enter the 6-digit profile PIN.'); return; }
            setVerifying(true);
            try { await activateChild(pendingChild.id, pin); setPendingChild(null); }
            catch (error) { setPin(''); setPinError((error as { message?: string }).message || 'That child PIN was not correct. Please try again.'); }
            finally { setVerifying(false); }
          }} className="space-y-4">
            <p className="text-sm text-muted">Enter the six-digit profile PIN for this child.</p>
            <Input label="Child PIN" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
            {pinError && <Alert>{pinError}</Alert>}
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><Button type="button" variant="ghost" onClick={() => setPendingChild(null)}>Cancel</Button><Button type="submit" loading={verifying}>Open child mode</Button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
