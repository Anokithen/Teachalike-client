'use client';

import { FormEvent, useState } from 'react';
import { ShieldPlus } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiErrorShape } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';

interface NewAdminForm {
  name: string;
  email: string;
  password: string;
}

export default function NewAdminPage() {
  const [form, setForm] = useState<NewAdminForm>({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | string[] | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await adminApi.createAdmin(form);
      setForm({ name: '', email: '', password: '' });
      setSuccess(true);
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader eyebrow="Admin workspace" title="Add an admin" icon={ShieldPlus} description="Bootstrap another administrator account. There&apos;s no public sign-up for this role." />

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            maxLength={120}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Alert>{error}</Alert>
          {success && <Alert tone="success">Admin account created.</Alert>}
          <Button type="submit" loading={loading} className="w-full">
            Create admin
          </Button>
        </form>
      </Card>
    </div>
  );
}
