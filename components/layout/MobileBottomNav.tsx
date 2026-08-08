'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, LibraryBig, Trophy, UsersRound, Baby } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const PARENT_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/children', label: 'Children', icon: Baby },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/leaderboard', label: 'Points', icon: Trophy },
];

const TEACHER_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/teacher/books', label: 'My books', icon: LibraryBig },
  { href: '/books', label: 'Library', icon: BookOpen },
  { href: '/children', label: 'Children', icon: Baby },
];

const ADMIN_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/parents', label: 'Parents', icon: UsersRound },
  { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
  { href: '/admin/book-views', label: 'Reports', icon: BarChart3 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAdmin, isTeacher } = useAuth();
  const items = isAdmin ? ADMIN_ITEMS : isTeacher ? TEACHER_ITEMS : PARENT_ITEMS;
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-surface/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(2,56,89,.1)] backdrop-blur lg:hidden" aria-label="Quick navigation">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-bold transition-colors ${active ? 'bg-brand-400/15 text-brand-700' : 'text-muted hover:bg-bg hover:text-brand-700'}`}>
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
