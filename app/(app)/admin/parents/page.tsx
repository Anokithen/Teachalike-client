'use client';

import { useEffect, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { AccountCreateForm, AccountsTable } from '@/components/admin/AccountsTable';
import { Account, ApiErrorShape } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminParentsPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | string[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await adminApi.listParents();
      setAccounts(res.data.parents);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }

  async function onCreate(form: AccountCreateForm): Promise<boolean> {
    setCreateError(null);
    setCreating(true);
    try {
      await adminApi.createParent(form);
      await load();
      return true;
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setCreateError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
      return false;
    } finally {
      setCreating(false);
    }
  }

  async function onBan(id: number) {
    await adminApi.banParent(id);
    await load();
  }

  async function onUnban(id: number) {
    await adminApi.unbanParent(id);
    await load();
  }

  async function onDelete(id: number) {
    await adminApi.deleteParent(id);
    await load();
  }

  return (
    <div>
      <PageHeader eyebrow="Admin workspace" title="Parents" icon={UsersRound} description="Manage parent accounts across the platform." />
      <div className="mt-6">
        <AccountsTable
          label="parent"
          accounts={accounts}
          error={error}
          onBan={onBan}
          onUnban={onUnban}
          onDelete={onDelete}
          onCreate={onCreate}
          createError={createError}
          creating={creating}
        />
      </div>
    </div>
  );
}
