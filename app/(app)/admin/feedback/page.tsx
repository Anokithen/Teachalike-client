'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, UserRound } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { ApiErrorShape } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface UserFeedback {
  id: number;
  category: 'general' | 'suggestion' | 'problem' | 'compliment';
  subject: string;
  message: string;
  created_at: string;
  user: { id: number; name: string; email: string; role: string };
}
interface Pagination { page: number; pages: number; per_page: number; total: number }
const CATEGORY_LABELS = { general: 'General', suggestion: 'Suggestion', problem: 'Problem', compliment: 'Compliment' };
const CATEGORY_TONES = { general: 'brand', suggestion: 'warning', problem: 'danger', compliment: 'success' } as const;

export default function AdminFeedbackPage() {
  const [entries, setEntries] = useState<UserFeedback[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEntries(null);
    setError(null);
    try {
      const response = await adminApi.listFeedback({ category: category || undefined, page });
      setEntries(response.data.feedback);
      setPagination(response.data.pagination);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }, [category, page]);

  useEffect(() => { void load(); }, [load]);

  return <div>
    <PageHeader eyebrow="Admin inbox" title="User feedback" icon={MessageSquareText} description="Read ideas, problem reports, and comments sent by TeachAlike users." />
    <Card className="mb-5 mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Select label="Filter by feedback type" className="sm:min-w-64" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="">All feedback</option><option value="general">General</option><option value="suggestion">Suggestions</option><option value="problem">Problems</option><option value="compliment">Compliments</option>
        </Select>
        {pagination && <p className="pb-2 text-sm font-semibold text-muted">{pagination.total.toLocaleString()} message{pagination.total === 1 ? '' : 's'}</p>}
      </div>
    </Card>
    {error && <Alert>{error}</Alert>}
    {!entries && !error && <div className="flex justify-center py-16"><Spinner size={28} /></div>}
    {entries?.length === 0 && <EmptyState title="No feedback yet" description={category ? 'No messages match this feedback type.' : 'Messages from users will appear here.'} />}
    {entries && entries.length > 0 && <div className="grid gap-4 lg:grid-cols-2">
      {entries.map((entry) => <Card key={entry.id} className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge tone={CATEGORY_TONES[entry.category]}>{CATEGORY_LABELS[entry.category]}</Badge>
          <time className="text-xs text-muted" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
        </div>
        <h2 className="mt-4 break-words text-lg font-bold text-brand-900">{entry.subject}</h2>
        <p className="mt-2 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{entry.message}</p>
        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-400/10 text-brand-600"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="truncate text-sm font-bold text-brand-900">{entry.user.name}</p><p className="truncate text-xs text-muted">{entry.user.email} · <span className="capitalize">{entry.user.role}</span></p></div>
        </div>
      </Card>)}
    </div>}
    {pagination && pagination.pages > 1 && <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Feedback pages"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><p className="text-sm text-muted">Page {pagination.page} of {pagination.pages}</p><Button variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
  </div>;
}
