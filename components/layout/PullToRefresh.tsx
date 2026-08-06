'use client';

import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 112;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const touchStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (refreshing || window.scrollY > 0) return;
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (touchStartY.current === null || refreshing || window.scrollY > 0) return;
    const distance = (event.touches[0]?.clientY ?? 0) - touchStartY.current;
    if (distance <= 0) {
      setPullDistance(0);
      return;
    }
    event.preventDefault();
    setPullDistance(Math.min(MAX_PULL_DISTANCE, distance * 0.55));
  }

  function handleTouchEnd() {
    if (touchStartY.current === null) return;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD * 0.55;
    touchStartY.current = null;
    setPullDistance(0);
    if (shouldRefresh) {
      setRefreshing(true);
      window.location.reload();
    }
  }

  return (
    <div
      className="relative overscroll-y-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="pointer-events-none fixed left-1/2 top-2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold text-brand-700 shadow-card transition-opacity dark:text-brand-400"
        style={{
          opacity: pullDistance > 0 || refreshing ? 1 : 0,
          transform: `translate(-50%, ${Math.min(1, pullDistance / (PULL_THRESHOLD * 0.55)) * 2.5 - 0.5}rem)`,
        }}
        aria-live="polite"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        {refreshing ? 'Refreshing…' : pullDistance >= PULL_THRESHOLD * 0.55 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
      {children}
    </div>
  );
}
