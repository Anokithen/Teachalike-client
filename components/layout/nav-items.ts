import {
  Baby,
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Mic2,
  ShieldPlus,
  Trophy,
  UserCircle,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function getNavItems({ isAdmin, isTeacher = false }: { isAdmin: boolean; isTeacher?: boolean }): NavItem[] {
  if (isAdmin) {
    return [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/parents', label: 'Parents', icon: UsersRound },
      { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
      { href: '/admin/admins/new', label: 'Add admin', icon: ShieldPlus },
      { href: '/admin/books/new', label: 'Add book', icon: LibraryBig },
      { href: '/admin/book-views', label: 'Book views', icon: BarChart3 },
      { href: '/voice-profiles', label: 'Voice recordings', icon: Mic2 },
      { href: '/children', label: 'Children', icon: Baby },
      { href: '/books', label: 'Books', icon: BookOpen },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { href: '/account', label: 'My account', icon: UserCircle },
    ];
  }
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/children', label: 'Children', icon: Baby },
    { href: '/books', label: 'Books', icon: BookOpen },
    { href: '/voice-profiles', label: 'Voice profiles', icon: Mic2 },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/account', label: 'My account', icon: UserCircle },
  ];
  if (isTeacher) {
    items.splice(1, 0,
      { href: '/teacher/books', label: 'My books', icon: LibraryBig },
      { href: '/teacher/books/create', label: 'Create book', icon: BookOpen },
    );
  }
  return items;
}
