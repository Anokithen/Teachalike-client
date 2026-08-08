'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Eye, Heart, Pencil, Plus, Trash2 } from 'lucide-react';
import { teacherBooksApi } from '@/lib/endpoints';
import { ApiErrorShape, TeacherBook } from '@/lib/types';
import { BookAttribution } from '@/components/books/BookAttribution';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

export default function TeacherBooksPage() {
  const [books, setBooks] = useState<TeacherBook[] | null>(null);
  const [deleting, setDeleting] = useState<TeacherBook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const response = await teacherBooksApi.list(); setBooks(response.data.books); }
    catch (err) { setError((err as ApiErrorShape).message); }
  }, []);
  useEffect(() => {
    void load();
    const message = window.sessionStorage.getItem('teacher-book-saved');
    if (message) { setSuccess(message); window.sessionStorage.removeItem('teacher-book-saved'); }
  }, [load]);
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError(null);
    try { await teacherBooksApi.remove(deleting.id); setSuccess('Book deleted successfully.'); setDeleting(null); await load(); }
    catch (err) { setError((err as ApiErrorShape).message); }
    finally { setBusy(false); }
  }
  return <div>
    <PageHeader eyebrow="Teacher library" title="My books" icon={BookOpen} description="Create stories, update your media, and see aggregate reader engagement." action={<Link href="/teacher/books/create" className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />Create book</Link>} />
    <div className="mt-5 space-y-3">{success && <Alert tone="success">{success}</Alert>}{error && <Alert>{error}</Alert>}</div>
    {!books && !error && <div className="flex justify-center py-16"><Spinner size={28} /></div>}
    {books?.length === 0 && <EmptyState title="You have not created a book yet" description="Publish your first child-friendly story for the TeachAlike library." action={<Link href="/teacher/books/create" className="btn-primary">Create your first book</Link>} />}
    {books && books.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{books.map((book) => <Card key={book.id} className="flex h-full flex-col overflow-hidden p-0">
      {book.cover_image_url ? <img src={book.cover_image_url} alt="" loading="lazy" decoding="async" className="h-40 w-full object-cover" /> : <div className="grid h-40 place-items-center bg-brand-400/10"><BookOpen className="h-10 w-10 text-brand-500" aria-hidden="true" /></div>}
      <div className="flex flex-1 flex-col p-5"><h2 className="text-lg font-bold text-brand-900">{book.title}</h2><BookAttribution label={book.created_by_label} className="mt-1" />
      <div className="mt-3 flex gap-2"><Badge tone="brand">{book.age_group}</Badge><Badge tone="neutral">{book.reading_level}</Badge></div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="soft-inset rounded-xl p-2"><Eye className="mx-auto h-4 w-4 text-brand-600" /><dt className="text-xs text-muted">Views</dt><dd className="font-bold text-brand-900">{book.total_views.toLocaleString()}</dd></div><div className="soft-inset rounded-xl p-2"><BookOpen className="mx-auto h-4 w-4 text-brand-600" /><dt className="text-xs text-muted">Reads</dt><dd className="font-bold text-brand-900">{book.total_reads.toLocaleString()}</dd></div><div className="soft-inset rounded-xl p-2"><Heart className="mx-auto h-4 w-4 text-pink" /><dt className="text-xs text-muted">Likes</dt><dd className="font-bold text-brand-900">{book.likes.toLocaleString()}</dd></div></dl>
      <p className="mt-4 text-xs text-muted">Created {book.created_at ? new Date(book.created_at).toLocaleDateString() : '—'} · Updated {book.updated_at ? new Date(book.updated_at).toLocaleDateString() : '—'}</p>
      <div className="mt-auto flex gap-2 pt-4"><Link href={`/teacher/books/${book.id}/edit`} className="btn-secondary flex-1"><Pencil className="h-4 w-4" />Edit</Link><Button variant="danger" onClick={() => setDeleting(book)} aria-label={`Delete ${book.title}`}><Trash2 className="h-4 w-4" /></Button></div></div>
    </Card>)}</div>}
    <ConfirmDialog open={Boolean(deleting)} onClose={() => !busy && setDeleting(null)} onConfirm={remove} loading={busy} title={deleting ? `Delete ${deleting.title}?` : 'Delete book?'} description="This permanently removes the book and its managed media. Books with reading sessions cannot be deleted." confirmLabel="Delete book" />
  </div>;
}
