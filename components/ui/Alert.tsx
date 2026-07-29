import { ReactNode } from 'react';

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
  if (!children) return null;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm shadow-sm motion-safe:animate-[fade-slide-in_.2s_ease-out] ${TONES[tone]}`}>
      {Array.isArray(children) ? (
        <ul className="list-inside list-disc space-y-0.5">
          {children.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        children
      )}
    </div>
  );
}
