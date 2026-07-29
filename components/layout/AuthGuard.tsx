'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSplash } from '@/components/ui/LoadingSplash';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
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
    }
  }, [isLoading, isAuthenticated, isAdmin, pathname, router]);

  const isUnauthorizedAdminRoute = pathname?.startsWith('/admin') && !isAdmin;

  if (isLoading || !isAuthenticated || isUnauthorizedAdminRoute) {
    return <LoadingSplash />;
  }

  return <>{children}</>;
}
