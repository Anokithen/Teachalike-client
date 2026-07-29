'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/Logo';

interface Feature {
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Guided reading sessions',
    body: 'Children read at their own pace while progress and accuracy are logged page by page.',
  },
  {
    title: 'A voice they know',
    body: 'Record a parent voice profile once — sessions can carry that familiar voice through feedback.',
  },
  {
    title: 'Mini-games tied to books',
    body: 'Each title links to a short game that turns comprehension into points on the board.',
  },
  {
    title: 'Weekly leaderboard',
    body: 'Points and streaks roll up every week, so progress is visible at a glance.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-night min-h-[100dvh]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <Logo />
        <nav className="ml-auto flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-400/20 px-3 py-1 text-xs font-semibold text-cyan-100 ring-1 ring-brand-400/50">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              For parents &amp; teachers
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              A reading companion that sounds like home.
            </h1>
            <p className="mt-5 max-w-lg text-base text-blue-100/85">
              TeachAlike turns every reading session into guided practice: track progress, generate
              encouraging feedback, and — when you want it — narrate in a parent&apos;s own cloned voice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Create your account
              </Link>
              <Link href="/login" className="btn-home-outline">
                I already have an account
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium uppercase tracking-wide text-cyan-200">
              Learn. Listen. Grow.
            </p>
          </div>
          <div className="home-logo-frame flex justify-center">
            <Image
              src="/Teachalike_logo.png"
              alt="TeachAlike — a parent and child reading together"
              width={360}
              height={360}
              priority
              className="home-logo w-full max-w-sm"
            />
          </div>
        </section>

        <section className="grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="home-feature card p-5">
              <h3 className="mb-2 text-sm font-semibold text-brand-900">{f.title}</h3>
              <p className="text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-blue-100/75">
        TeachAlike — Learn. Listen. Grow.
      </footer>
    </div>
  );
}
