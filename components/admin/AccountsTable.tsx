'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { Account } from '@/lib/types';

export interface AccountCreateForm {
  name: string;
  email: string;
  password: string;
}

interface AccountsTableProps {
  label: string; // "parent" | "teacher"
  accounts: Account[] | null;
  error: string | null;
  onBan: (id: number) => Promise<void>;
  onUnban: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCreate: (form: AccountCreateForm) => Promise<boolean>;
  createError: string | string[] | null;
  creating: boolean;
}

export function AccountsTable({
  label,
  accounts,
  error,
  onBan,
  onUnban,
  onDelete,
  onCreate,
  createError,
  creating,
}: AccountsTableProps) {
  const { account: me } = useAuth();
  const [form, setForm] = useState<AccountCreateForm>({ name: '', email: '', password: '' });
  const [pendingBan, setPendingBan] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [rowLoading, setRowLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (await onCreate(form)) setForm({ name: '', email: '', password: '' });
  }

  async function confirmBanToggle() {
    if (!pendingBan) return;
    setRowLoading(pendingBan.id);
    setActionError(null);
    try {
      if (pendingBan.is_banned) await onUnban(pendingBan.id);
      else await onBan(pendingBan.id);
      setPendingBan(null);
    } catch (err) {
      setActionError((err as { message?: string }).message || 'Could not update this account. Please try again.');
    } finally {
      setRowLoading(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setRowLoading(pendingDelete.id);
    setActionError(null);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setActionError((err as { message?: string }).message || 'Could not delete this account. Please try again.');
    } finally {
      setRowLoading(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {!accounts && !error && (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        {actionError && <Alert>{actionError}</Alert>}
        {accounts && accounts.length === 0 && <EmptyState title={`No ${label}s yet`} />}
        {accounts && accounts.length > 0 && (
          <Table layout="auto" label={`${label} accounts`} columns={['Name', 'Email', 'Children', 'Status', 'Actions']} mobileChildren={accounts.map((a) => {
            const isSelf = a.id === me?.id;
            return (
              <article key={`mobile-${a.id}`} className="min-w-0 rounded-2xl border border-border bg-bg/35 p-4">
                <dl className="grid gap-2 text-sm">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Name</dt><dd className="mt-0.5 break-words font-semibold text-brand-900">{a.name}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Email</dt><dd className="mt-0.5 break-all text-brand-700">{a.email}</dd></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Children</dt><dd className="mt-0.5 text-brand-900">{a.children_count ?? '—'}</dd></div>
                    <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt><dd className="mt-0.5"><Badge tone={a.is_banned ? 'danger' : 'success'}>{a.is_banned ? 'Banned' : 'Active'}</Badge></dd></div>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2" aria-label={`Actions for ${a.name}`}>
                  <Button variant="ghost" disabled={isSelf} title={isSelf ? "You can't ban your own account" : undefined} onClick={() => setPendingBan(a)}>{a.is_banned ? 'Unban' : 'Ban'}</Button>
                  <Button variant="ghost" className="text-danger" disabled={isSelf} title={isSelf ? "You can't delete your own account" : undefined} onClick={() => setPendingDelete(a)}>Delete</Button>
                </div>
              </article>
            );
          })}>
            {accounts.map((a) => {
              const isSelf = a.id === me?.id;
              return (
                <tr key={a.id}>
                  <td className="max-w-[13rem] break-words px-4 py-3 font-medium text-brand-900">{a.name}</td>
                  <td className="max-w-[16rem] break-all px-4 py-3 text-muted">{a.email}</td>
                  <td className="px-4 py-3 text-muted">{a.children_count ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.is_banned ? 'danger' : 'success'}>
                      {a.is_banned ? 'Banned' : 'Active'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex min-w-max flex-nowrap justify-end gap-2">
                      <Button
                        variant="ghost"
                        className="shrink-0 whitespace-nowrap"
                        disabled={isSelf}
                        title={isSelf ? "You can't ban your own account" : undefined}
                        onClick={() => setPendingBan(a)}
                      >
                        {a.is_banned ? 'Unban' : 'Ban'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="shrink-0 whitespace-nowrap text-danger"
                        disabled={isSelf}
                        title={isSelf ? "You can't delete your own account" : undefined}
                        onClick={() => setPendingDelete(a)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-brand-900 capitalize">Add a {label}</h2>
        <form onSubmit={submitCreate} className="space-y-4">
          <Input label="Name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
          <Alert>{createError}</Alert>
          <Button type="submit" loading={creating} className="w-full capitalize">
            Create {label}
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={!!pendingBan}
        onClose={() => setPendingBan(null)}
        onConfirm={confirmBanToggle}
        loading={rowLoading === pendingBan?.id}
        danger={!pendingBan?.is_banned}
        title={pendingBan?.is_banned ? `Unban ${pendingBan?.name}?` : `Ban ${pendingBan?.name}?`}
        description={
          pendingBan?.is_banned
            ? 'They will regain access immediately.'
            : 'Their tokens are revoked immediately and they will be signed out.'
        }
        confirmLabel={pendingBan?.is_banned ? 'Unban' : 'Ban'}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={rowLoading === pendingDelete?.id}
        title={`Delete ${pendingDelete?.name}?`}
        description="This permanently removes their account and cascades to their children and voice profiles."
        confirmLabel="Delete"
      />
    </div>
  );
}
