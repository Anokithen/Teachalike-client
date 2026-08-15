'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { authApi } from '@/lib/endpoints';
import { normalizeError } from '@/lib/api';

type TokenState = 'checking' | 'valid' | 'expired' | 'invalid';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [tokenState, setTokenState] = useState<TokenState>('checking');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) { setTokenState('invalid'); return; }
    authApi.validateResetToken(token)
      .then(() => { if (active) setTokenState('valid'); })
      .catch((requestError) => {
        if (!active) return;
        const apiError = normalizeError(requestError);
        setTokenState(apiError.errorCode === 'RESET_TOKEN_EXPIRED' ? 'expired' : 'invalid');
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => router.replace('/login'), 3000);
    return () => window.clearTimeout(timer);
  }, [router, success]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password.length > 128) return setError('Password must be 128 characters or fewer.');
    if (password !== confirmation) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      const apiError = normalizeError(requestError);
      if (apiError.errorCode === 'RESET_TOKEN_EXPIRED') setTokenState('expired');
      else if (apiError.errorCode === 'RESET_TOKEN_INVALID') setTokenState('invalid');
      else setError(apiError.message || 'Password could not be updated. Please try again.');
    } finally { setLoading(false); }
  };

  if (tokenState === 'checking') return <div role="status" className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted"><Spinner size={18} /> Checking reset link...</div>;
  if (success) return <div role="status" className="text-center"><h1 className="text-xl font-semibold text-brand-900">Password updated successfully!</h1><p className="mt-3 text-sm text-muted">You can now sign in using your new password.</p><Link href="/login" className="btn-primary mt-6 w-full">Go to Login</Link></div>;
  if (tokenState !== 'valid') return <div role="alert" className="text-center"><h1 className="text-xl font-semibold text-brand-900">{tokenState === 'expired' ? 'This password reset link has expired.' : 'This password reset link is invalid or has already been used.'}</h1><p className="mt-3 text-sm text-muted">Request a new password reset link.</p><Link href="/forgot-password" className="btn-primary mt-6 w-full">Request New Link</Link></div>;

  return <><h1 className="mb-2 text-xl font-semibold text-brand-900">Reset Password</h1><p className="mb-6 text-sm text-muted">Choose a new password with at least 8 characters.</p><form onSubmit={submit} className="space-y-4"><Input label="New Password" type="password" name="new-password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} error={error || undefined} onChange={(event) => setPassword(event.target.value)} /><Input label="Confirm New Password" type="password" name="confirm-password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><Button type="submit" loading={loading} className="w-full">{loading ? 'Resetting...' : 'Reset Password'}</Button></form></>;
}

export default function ResetPasswordPage() {
  return <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4 sm:py-12"><main className="w-full max-w-sm"><div className="mb-8 flex justify-center"><Logo /></div><div className="neumorphic-card relative overflow-hidden p-5 sm:p-8"><Sparkles className="pointer-events-none absolute right-5 top-4 h-5 w-5 text-gold/70" aria-hidden="true" /><Suspense fallback={<div className="flex min-h-28 items-center justify-center"><Spinner size={18} /></div>}><ResetPasswordForm /></Suspense></div></main></div>;
}
