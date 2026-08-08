'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PullToRefresh } from '@/components/layout/PullToRefresh';
import { ActiveChildProvider } from '@/lib/active-child-context';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <ActiveChildProvider>
      <PullToRefresh>
        <div className="app-shell flex min-h-[100dvh] min-w-0">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col app-content-surface lg:ml-[308px]">
            <Topbar
              onMenuClick={() => setSidebarOpen(true)}
            />
            <main className="min-w-0 flex-1 bg-transparent px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
              <div className="mx-auto max-w-7xl motion-safe:animate-[fade-slide-in_.25s_ease-out]">{children}</div>
            </main>
          </div>
        </div>
      </PullToRefresh>
      </ActiveChildProvider>
    </AuthGuard>
  );
}
