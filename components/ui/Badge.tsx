import { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-border/60 text-muted ring-1 ring-border/70',
  brand: 'bg-brand-400/15 text-brand-600 ring-1 ring-brand-400/20',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

interface BadgeProps {
  tone?: Tone;
  children?: ReactNode;
  className?: string;
}

export function Badge({ tone = 'brand', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
