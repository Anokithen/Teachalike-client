'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { authApi } from '@/lib/endpoints';
import { ApiErrorShape } from '@/lib/types';
import { Logo } from '@/components/layout/Logo';
import { Spinner } from '@/components/ui/Spinner';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!token) {
        setState('error');
        setMessage('This verification link is missing a token.');
        return;
      }
      try {
        const response = await authApi.verifyEmail({ token });
        if (!active) return;
        setState('success');
        setMessage(response.data.message || 'Email verified! You can now sign in to TeachAlike.');
      } catch (err) {
        if (!active) return;
        setState('error');
        setMessage((err as ApiErrorShape).message || 'This verification link is invalid or expired.');
      }
    }
    void verify();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="neumorphic-card p-6 sm:p-9" role="status" aria-live="polite">
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${state === 'success' ? 'bg-success/10 text-success' : state === 'error' ? 'bg-danger/10 text-danger' : 'bg-brand-400/10 text-brand-600'}`}>
            {state === 'loading' ? <Spinner size={28} /> : state === 'success' ? <CheckCircle2 className="h-8 w-8" aria-hidden="true" /> : <XCircle className="h-8 w-8" aria-hidden="true" />}
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-brand-900">
            {state === 'success' ? 'Email verified!' : state === 'error' ? 'Verification link problem' : 'Checking link'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="btn-primary inline-flex">Go to login</Link>
            {state === 'error' && <Link href="/login" className="btn-secondary inline-flex">Resend from login</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
