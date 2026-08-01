'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSplash } from '@/components/ui/LoadingSplash';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (pathname?.startsWith('/admin') && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (pathname?.startsWith('/teacher') && !isTeacher) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, isTeacher, pathname, router]);

  const isUnauthorizedAdminRoute = pathname?.startsWith('/admin') && !isAdmin;
  const isUnauthorizedTeacherRoute = pathname?.startsWith('/teacher') && !isTeacher;

  if (isLoading || !isAuthenticated || isUnauthorizedAdminRoute || isUnauthorizedTeacherRoute) {
    return <LoadingSplash />;
  }

  return <>{children}</>;
}
