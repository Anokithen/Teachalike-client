'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/Logo';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiErrorShape, PublicAccountType, TeacherType } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';
import { GoogleIdentityButton } from '@/components/auth/GoogleIdentityButton';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  accountType: PublicAccountType;
  phoneNumber: string;
  address: string;
  teacherType: TeacherType;
  schoolName: string;
  tuitionName: string;
  professionalPhoto: File | null;
}

const EMPTY_FORM: RegisterForm = {
  name: '',
  email: '',
  password: '',
  accountType: 'parent',
  phoneNumber: '',
  address: '',
  teacherType: 'school',
  schoolName: '',
  tuitionName: '',
  professionalPhoto: null,
};

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [error, setError] = useState<string | string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherSubmitted, setTeacherSubmitted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.accountType === 'teacher' && !form.professionalPhoto) {
      setError('A professional profile photo is required.');
      return;
    }
    if (form.professionalPhoto && !isAllowedUploadFile(form.professionalPhoto, 'image')) {
      setError(uploadFormatError('image'));
      return;
    }
    if (form.professionalPhoto && form.professionalPhoto.size > 10 * 1024 * 1024) {
      setError('The professional photo must be 10 MB or smaller.');
      return;
    }

    setLoading(true);
    try {
      if (form.accountType === 'teacher') {
        const payload = new FormData();
        payload.set('account_type', 'teacher');
        payload.set('name', form.name);
        payload.set('email', form.email);
        payload.set('password', form.password);
        payload.set('phone_number', form.phoneNumber);
        payload.set('address', form.address);
        payload.set('teacher_type', form.teacherType);
        if (form.teacherType === 'school' && form.schoolName.trim()) {
          payload.set('school_name', form.schoolName);
        }
        if (form.teacherType === 'private_tuition' && form.tuitionName.trim()) {
          payload.set('tuition_name', form.tuitionName);
        }
        payload.set('professional_photo', form.professionalPhoto as File);
        await register(payload);
        setTeacherSubmitted(true);
        return;
      }

      const response = await register({
        account_type: 'parent',
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setVerificationEmail(response.email || form.email);
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      window.location.assign('/dashboard');
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setError(apiError.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verificationEmail) {
    return (
      <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center"><Logo /></div>
          <div className="neumorphic-card p-6 sm:p-9" role="status">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-400/10 text-brand-600">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-brand-900">Check your inbox</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              We sent a verification link to {verificationEmail}. Verify your email before signing in.
            </p>
            <Link href="/login" className="btn-primary mt-6 inline-flex">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (teacherSubmitted) {
    return (
      <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center"><Logo /></div>
          <div className="neumorphic-card p-6 sm:p-9" role="status">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-brand-900">Application received</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Your teacher registration has been submitted and is waiting for administrator approval.
              You can log in after an administrator approves it.
            </p>
            <Link href="/login" className="btn-primary mt-6 inline-flex">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  const isTeacher = false;
  return (
    <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-bg px-3 py-8 sm:px-4 sm:py-12">
      <div className={`w-full ${isTeacher ? 'max-w-2xl' : 'max-w-sm'}`}>
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="neumorphic-card relative overflow-hidden p-5 sm:p-8">
          <Sparkles className="pointer-events-none absolute right-5 top-4 h-5 w-5 text-gold/70" aria-hidden="true" />
          <h1 className="mb-1 text-xl font-semibold text-brand-900">Create your account</h1>
          <p className="mb-6 text-sm text-muted">Create a parent account to start using TeachAlike.</p>

          <GoogleIdentityButton onCredential={onGoogleCredential} disabled={loading} />
          <div className="flex items-center gap-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className={isTeacher ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
              <Input label="Name" name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input label="Email" type="email" name="email" autoComplete="email" required maxLength={120} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <Input label="Password" type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              {isTeacher && <Input label="Phone number" name="phone_number" type="tel" autoComplete="tel" required maxLength={40} value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />}
            </div>

            {isTeacher && (
              <div className="space-y-4 rounded-3xl border border-brand-400/20 bg-brand-400/5 p-4 sm:p-5">
                <Textarea label="Address" name="address" autoComplete="street-address" required maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                <Select label="Teacher type" name="teacher_type" required value={form.teacherType} onChange={(event) => setForm({ ...form, teacherType: event.target.value as TeacherType })}>
                  <option value="school">School teacher</option>
                  <option value="private_tuition">Private tuition teacher</option>
                </Select>
                {form.teacherType === 'school' ? (
                  <Input label="School name (optional)" name="school_name" maxLength={200} value={form.schoolName} onChange={(event) => setForm({ ...form, schoolName: event.target.value })} />
                ) : (
                  <Input label="Tuition name (optional)" name="tuition_name" maxLength={200} value={form.tuitionName} onChange={(event) => setForm({ ...form, tuitionName: event.target.value })} />
                )}
                <Input label="Professional profile photo" name="professional_photo" type="file" required accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, professionalPhoto: event.target.files?.[0] || null })} aria-describedby="professional-photo-help" />
                <p id="professional-photo-help" className="text-xs text-muted">JPG, PNG or WebP, up to 10 MB. This becomes your profile picture.</p>
              </div>
            )}

            <Alert>{error}</Alert>
            <Button type="submit" loading={loading} className="w-full">
              {isTeacher ? 'Submit teacher application' : 'Create parent account'}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-brand-600 hover:underline">Log in</Link></p>
      </div>
    </div>
  );
}
