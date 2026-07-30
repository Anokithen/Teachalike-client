'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiErrorShape } from '@/lib/types';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [error, setError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form);
      router.push('/dashboard');
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4 sm:py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="neumorphic-card relative overflow-hidden p-5 sm:p-8">
          <Sparkles className="pointer-events-none absolute right-5 top-4 h-5 w-5 text-gold/70" aria-hidden="true" />
          <h1 className="mb-1 text-xl font-semibold text-brand-900">Log in</h1>
          <p className="mb-6 text-sm text-muted">Welcome back — pick up where you left off.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={120}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Alert>{error}</Alert>
            <Button type="submit" loading={loading} className="w-full">
              Log in
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          New to TeachAlike?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
