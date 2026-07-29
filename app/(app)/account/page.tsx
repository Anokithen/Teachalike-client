'use client';

import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { accountApi } from '@/lib/endpoints';
import { clearTokens } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ApiErrorShape } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';
import { PageHeader } from '@/components/ui/PageHeader';
import { PwaInstallCard } from '@/components/pwa/PwaInstallCard';

interface AccountForm {
  name: string;
  email: string;
  password: string;
  currentPassword: string;
}

export default function AccountPage() {
  const { account, refreshAccount } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<AccountForm>({
    name: account?.name || '',
    email: account?.email || '',
    password: '',
    currentPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const profileImageInput = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    const sensitiveChange =
      Boolean(form.password) ||
      form.email.trim().toLowerCase() !== account?.email.toLowerCase();
    if (sensitiveChange && !form.currentPassword) {
      setSaveError(
        'Enter your current account password to change the email or password.',
      );
      return;
    }
    setSaving(true);
    try {
      const payload: {
        name: string;
        email: string;
        password?: string;
        current_password?: string;
      } = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      if (sensitiveChange) payload.current_password = form.currentPassword;
      await accountApi.update(payload);
      if (profileImageFile) {
        const image = new FormData();
        image.append('profile_image', profileImageFile);
        await accountApi.uploadProfileImage(image);
        setProfileImageFile(null);
        if (profileImageInput.current) profileImageInput.current.value = '';
      }
      await refreshAccount();
      setForm((f) => ({ ...f, password: '', currentPassword: '' }));
      setSaved(true);
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setSaveError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
    } finally {
      setSaving(false);
    }
  }

  function onProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSaveError(null);
    if (!file) return setProfileImageFile(null);
    if (!isAllowedUploadFile(file, 'image')) {
      event.target.value = '';
      setProfileImageFile(null);
      setSaveError(uploadFormatError('image'));
      return;
    }
    setProfileImageFile(file);
  }

  async function removeProfileImage() {
    setSaveError(null);
    setSaving(true);
    try {
      await accountApi.removeProfileImage();
      setProfileImageFile(null);
      if (profileImageInput.current) profileImageInput.current.value = '';
      await refreshAccount();
    } catch (err) {
      setSaveError((err as ApiErrorShape).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('Enter your current account password.');
      return;
    }
    setDeleting(true);
    try {
      await accountApi.remove(deletePassword);
      clearTokens();
      router.push('/login');
    } catch (err) {
      setDeleteError((err as ApiErrorShape).message);
      setDeleting(false);
    }
  }

  if (!account) return null;

  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="Your TeachAlike space" title="My account" icon={UserCircle} description="Keep your profile and account details up to date." />
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="brand" className="capitalize">
          {account.role}
        </Badge>
        <span className="text-sm text-muted">
          Joined {new Date(account.created_at).toLocaleDateString()}
        </span>
      </div>

      <Card className="mt-6">
        <form onSubmit={onSave} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-brand-400 bg-brand-400/10 text-2xl font-bold text-brand-600">
              {account.profile_image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={account.profile_image_url} alt={`${account.name}'s profile`} className="h-full w-full object-cover" />
                </>
              ) : account.name[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <label htmlFor="account-profile-image" className="label">Profile picture (optional)</label>
              <input ref={profileImageInput} id="account-profile-image" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onProfileImageChange} className="input" />
              <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP only.</p>
              {account.profile_image_url && <Button type="button" variant="ghost" onClick={removeProfileImage} disabled={saving} className="mt-1 min-h-0 px-0 py-1 text-xs">Remove picture</Button>}
            </div>
          </div>
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
            id="account-current-password"
            label="Current password (required for email or password changes)"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={form.currentPassword}
            onChange={(e) =>
              setForm({ ...form, currentPassword: e.target.value })
            }
          />
          <Input
            label="New password (leave blank to keep current)"
            type="password"
            minLength={8}
            maxLength={128}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Alert>{saveError}</Alert>
          {saved && <Alert tone="success">Account updated.</Alert>}
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      </Card>

      {account.role === 'parent' && <PwaInstallCard />}

      <Card className="mt-6 border-danger/30">
        <h2 className="mb-1 text-sm font-semibold text-danger">Delete account</h2>
        <p className="mb-4 text-sm text-muted">
          This permanently removes your account, children, and voice profiles. This can&apos;t be undone.
        </p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Delete my account
        </Button>
      </Card>

      <Modal
        open={confirmDelete}
        onClose={() => {
          if (deleting) return;
          setConfirmDelete(false);
          setDeletePassword('');
          setDeleteError(null);
        }}
        title="Delete your account?"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={deleting}
              onClick={() => {
                setConfirmDelete(false);
                setDeletePassword('');
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={onDelete}
              disabled={!deletePassword}
            >
              Delete account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-muted">
            This permanently removes your account, all children profiles, and
            voice profiles. Confirm with your current account password.
          </p>
          <Input
            id="delete-account-password"
            label="Current account password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
          <Alert>{deleteError}</Alert>
        </div>
      </Modal>
    </div>
  );
}
