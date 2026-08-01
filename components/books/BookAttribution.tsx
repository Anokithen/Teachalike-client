import { UserRound } from 'lucide-react';

interface BookAttributionProps {
  label?: string | null;
  className?: string;
}

export function BookAttribution({ label, className = '' }: BookAttributionProps) {
  return (
    <p className={`inline-flex items-center gap-1.5 text-sm text-muted ${className}`}>
      <UserRound className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
      <span>{label || 'Created by TeachAlike'}</span>
    </p>
  );
}
