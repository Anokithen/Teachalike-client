'use client';

import { FormEvent, useEffect, useState } from 'react';
import { childrenApi } from '@/lib/endpoints';
import { ApiErrorShape, Child } from '@/lib/types';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ChildPinModalProps {
  child: Child | null;
  onClose: () => void;
  onVerified: (child: Child) => void;
}

export function ChildPinModal({ child, onClose, onVerified }: ChildPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setPin('');
    setError(null);
  }, [child]);

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!child) return;
    if (!child.has_pin) {
      setError('A parent must set a six-digit PIN for this child before activities can begin.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('Enter the six-digit PIN.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      await childrenApi.verifyPin(child.id, pin);
      onVerified(child);
      onClose();
    } catch (err) {
      setError((err as ApiErrorShape).message);
    } finally {
      setVerifying(false);
    }
  }

  return <Modal open={Boolean(child)} onClose={onClose} title={child ? `Enter ${child.name}'s PIN` : ''}>
    <form onSubmit={verify} className="space-y-4">
      <p className="text-muted">Enter the six-digit profile PIN before continuing.</p>
      <Input label="Profile PIN" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      <Alert>{error}</Alert>
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="w-full sm:w-auto" type="submit" loading={verifying}>Continue</Button>
      </div>
    </form>
  </Modal>;
}
