import Image from 'next/image';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="neumorphic-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="icon-bubble h-16 w-16 text-3xl" aria-hidden="true"><Image src="/Teachalike_logo.png" alt="" width={48} height={48} className="opacity-70" /></div>
      <p className="text-base font-bold text-brand-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
