'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/lib/endpoints';
import { normalizeError } from '@/lib/api';

const GENERIC_MESSAGE = "If an account exists with this email address, we've sent password reset instructions.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const normalized = email.trim();
    if (!normalized) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return setError('Enter a valid email address.');
    setLoading(true);
    try {
      await authApi.forgotPassword(normalized);
      setSuccess(GENERIC_MESSAGE);
    } catch (requestError) {
      const apiError = normalizeError(requestError);
      if (apiError.status === 429) setSuccess(GENERIC_MESSAGE);
      else setError(apiError.message || 'We could not submit your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4 sm:py-12">
      <main className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="neumorphic-card relative overflow-hidden p-5 sm:p-8">
          <Sparkles className="pointer-events-none absolute right-5 top-4 h-5 w-5 text-gold/70" aria-hidden="true" />
          <h1 className="mb-2 text-xl font-semibold text-brand-900">Forgot your password?</h1>
          <p className="mb-6 text-sm text-muted">Enter the email address associated with your TeachAlike account and we&apos;ll send you a link to reset your password.</p>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Input label="Email Address" type="email" name="email" autoComplete="email" required maxLength={120} value={email} error={error} onChange={(event) => setEmail(event.target.value)} />
            <Alert tone="success">{success}</Alert>
            <Button type="submit" loading={loading} className="w-full">{loading ? 'Sending...' : 'Send Reset Link'}</Button>
          </form>
          <Link href="/login" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-600 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Login
          </Link>
        </div>
      </main>
    </div>
  );
}
