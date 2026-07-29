import Image from 'next/image';
import { Circle, Sparkles, Star } from 'lucide-react';

export function LoadingSplash() {
  return (
    <div className="loading-splash" role="status" aria-live="polite" aria-label="TeachAlike is loading">
      <div className="loading-stars" aria-hidden="true">
        <Sparkles />
        <Circle fill="currentColor" />
        <Sparkles />
        <Star fill="currentColor" />
      </div>
      <div className="loading-logo-wrap">
        <Image src="/Teachalike_logo.png" alt="TeachAlike" width={104} height={104} priority className="loading-logo" />
      </div>
      <div className="rainbow-spinner" aria-hidden="true" />
      <p className="mt-5 text-lg font-semibold text-white">Getting your reading adventure ready…</p>
      <p className="mt-1 text-sm text-blue-100/80">Learn · Listen · Grow</p>
    </div>
  );
}
