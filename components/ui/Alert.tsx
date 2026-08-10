'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Tone = 'danger' | 'success' | 'warning';

const TONES: Record<Tone, string> = {
  danger: 'bg-danger/8 border-danger/30 text-danger',
  success: 'bg-success/8 border-success/30 text-success',
  warning: 'bg-warning/10 border-warning/30 text-warning',
};

interface AlertProps {
  tone?: Tone;
  children?: ReactNode;
}

export function Alert({ tone = 'danger', children }: AlertProps) {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let element = document.getElementById('floating-alert-viewport');
    if (!element) {
      element = document.createElement('div');
      element.id = 'floating-alert-viewport';
      element.className = 'pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md';
      element.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(element);
    }
    setViewport(element);
  }, []);

  if (!children || !viewport || dismissed) return null;
  return createPortal(
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur motion-safe:animate-[fade-slide-in_.2s_ease-out] ${TONES[tone]}`}>
      <div className="min-w-0 flex-1">
        {Array.isArray(children) ? (
          <ul className="list-inside list-disc space-y-0.5">
            {children.map((child, index) => <li key={index}>{child}</li>)}
          </ul>
        ) : children}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current/30"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>,
    viewport,
  );
}
