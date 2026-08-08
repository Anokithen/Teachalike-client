'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { getNavItems } from '@/components/layout/nav-items';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isTeacher } = useAuth();
  const items = getNavItems({ isAdmin, isTeacher });
  const activeHref = items
    .filter((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-brand-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
          className={`sidebar-kids fixed inset-y-2 left-2 z-50 flex h-[calc(100dvh-1rem)] w-[min(calc(100vw-1rem),20rem)] flex-col overflow-y-auto overscroll-contain p-4 transition-transform sm:inset-y-4 sm:left-4 sm:h-[calc(100dvh-2rem)] sm:p-5 lg:inset-y-auto lg:left-4 lg:top-4 lg:h-[calc(100dvh-2rem)] lg:w-[276px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] pointer-events-none lg:pointer-events-auto'
        }`}
      >
        <div className="mb-8 shrink-0 px-1">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-cyan-100 transition-transform hover:bg-white/10 active:scale-90 lg:hidden" aria-label="Go back and close menu">
              <ArrowLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => router.push('/dashboard')} className="hidden rounded-lg p-2 text-cyan-100 transition-transform hover:bg-white/10 active:scale-90 lg:block" aria-label="Close sidebar and return to dashboard">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all hover:translate-x-0.5 ${
                  active
                    ? 'sidebar-nav-active'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? 'bg-brand-400/15 text-brand-600' : 'bg-white/10 text-cyan-100'}`} aria-hidden="true">
                  <item.icon className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-5 shrink-0 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs text-blue-100">
          <p className="font-bold text-white">Read · Learn · Shine</p>
          <p className="mt-1 leading-5 text-blue-100/80">A little story every day makes a big difference.</p>
        </div>
      </aside>
    </>
  );
}
