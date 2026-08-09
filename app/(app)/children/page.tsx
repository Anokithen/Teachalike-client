'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Baby } from 'lucide-react';
import { childrenApi } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ChildFormModal } from '@/components/children/ChildFormModal';
import { ApiErrorShape, Child } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ChildrenPage() {
  const { isAdmin, isParent } = useAuth();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await childrenApi.list();
      setChildren(res.data.children);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Growing readers" title="Children" icon={Baby} description={isAdmin ? 'Every child profile on the platform.' : 'Manage the children you read with.'} action={isParent ? <Button onClick={() => setModalOpen(true)}>Add child</Button> : undefined} />

      <div className="mt-6">
        {!children && !error && (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        {children && children.length === 0 && (
          <EmptyState
            title="No children yet"
            description={
              isAdmin
                ? 'No child profiles have been created on the platform yet.'
                : 'Add your first child profile to start assigning books.'
            }
            action={
              isParent && (
                <Button onClick={() => setModalOpen(true)}>Add child</Button>
              )
            }
          />
        )}
        {children && children.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/children/${child.id}`}
                className="card block p-5 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-brand-400/40 bg-brand-400/10 font-semibold text-brand-600">
                      {child.profile_image_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={child.profile_image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        </>
                      ) : child.name[0]?.toUpperCase() || '?'}
                    </div>
                    <h3 className="truncate text-base font-semibold text-brand-900">{child.name}</h3>
                  </div>
                  <Badge tone="brand">{child.reading_level}</Badge>
                </div>
                <p className="text-sm text-muted">Age {child.age}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ChildFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(child) => setChildren((prev) => [...(prev || []), child])}
      />
    </div>
  );
}
