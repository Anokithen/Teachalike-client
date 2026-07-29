import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  compact?: boolean;
  href?: string;
}

export function Logo({ compact = false, href = '/' }: LogoProps) {
  return (
    <Link href={href} className="brand-logo flex items-center gap-2" aria-label="TeachAlike home">
      <span className="brand-logo-mark">
        <Image src="/Teachalike_logo.png" alt="" width={44} height={44} className="rounded-xl" priority />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-brand-900">
          Teach<span className="text-brand-400">Alike</span>
        </span>
      )}
    </Link>
  );
}
