import { LoaderCircle } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  light?: boolean;
}

export function Spinner({ size = 24, light = false }: SpinnerProps) {
  return (
    <LoaderCircle
      className={`animate-spin ${light ? 'text-white' : 'text-brand-400'}`}
      style={{ width: size, height: size }}
      strokeWidth={3}
      aria-hidden="true"
    />
  );
}
