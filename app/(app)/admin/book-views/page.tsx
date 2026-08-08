'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BarChart3, BookOpen, Eye, Heart } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { ApiErrorShape, BookAnalytics } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { BookAttribution } from '@/components/books/BookAttribution';

interface Pagination {
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

export default function AdminBookViewsPage() {
  const [books, setBooks] = useState<BookAnalytics[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'views' | 'reads' | 'likes'>('views');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBooks(null);
    setError(null);
    try {
      const response = await adminApi.bookAnalytics({ search: search || undefined, sort, page });
      setBooks(response.data.books);
      setPagination(response.data.pagination);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }, [page, search, sort]);

  useEffect(() => { void load(); }, [load]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  return <div>
    <PageHeader eyebrow="Admin analytics" title="Book views" icon={BarChart3} description="Compare daily authenticated views, reading sessions and child likes without exposing child activity." />
    <Card className="mb-5">
      <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
        <Input label="Search by book title or teacher" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books or creators" />
        <Select label="Sort by" value={sort} onChange={(event) => { setSort(event.target.value as 'views' | 'reads' | 'likes'); setPage(1); }}>
          <option value="views">Most views</option>
          <option value="reads">Most reads</option>
          <option value="likes">Most likes</option>
        </Select>
        <Button type="submit">Search</Button>
      </form>
    </Card>

    {error && <Alert>{error}</Alert>}
    {!books && !error && <div className="flex justify-center py-16"><Spinner size={28} /></div>}
    {books?.length === 0 && <EmptyState title="No books found" description={search ? 'Try a different title.' : 'Books will appear here after they are added.'} />}
    {books && books.length > 0 && <>
      <div className="hidden lg:block">
        <Table columns={['Book', 'Created by', 'Age / level', 'Views', 'Readers', 'Reads', 'Completed', 'Likes']}>
          {books.map((book) => <tr key={book.book_id}>
            <td className="px-4 py-3"><div className="flex items-center gap-3">{book.cover_image_url ? <img src={book.cover_image_url} alt="" className="h-14 w-11 rounded-xl object-cover" /> : <span className="grid h-14 w-11 place-items-center rounded-xl bg-brand-400/10"><BookOpen className="h-5 w-5 text-brand-600" /></span>}<span className="font-semibold text-brand-900">{book.title}</span></div></td>
            <td className="px-4 py-3"><BookAttribution label={book.created_by_label} /></td>
            <td className="px-4 py-3 text-muted"><p>{book.age_group}</p><p className="capitalize">{book.reading_level}</p></td>
            <td className="px-4 py-3 font-semibold text-brand-900">{book.total_views.toLocaleString()}<p className="text-xs font-normal text-muted">{book.unique_viewers.toLocaleString()} unique</p></td>
            <td className="px-4 py-3 text-muted">{book.unique_readers.toLocaleString()} unique</td>
            <td className="px-4 py-3 text-muted">{book.total_reads.toLocaleString()}</td>
            <td className="px-4 py-3 text-muted">{book.completed_reads.toLocaleString()}</td>
            <td className="px-4 py-3 text-muted">{book.likes.toLocaleString()}</td>
          </tr>)}
        </Table>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">{books.map((book) => <Card key={book.book_id}>
        <div className="flex gap-3">{book.cover_image_url && <img src={book.cover_image_url} alt="" className="h-20 w-16 rounded-xl object-cover" />}<div><h2 className="font-semibold text-brand-900">{book.title}</h2><BookAttribution label={book.created_by_label} className="mt-1" /><p className="text-sm capitalize text-muted">{book.age_group} · {book.reading_level}</p></div></div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center min-[380px]:grid-cols-3">
          <div className="soft-inset rounded-xl p-2"><Eye className="mx-auto h-4 w-4 text-brand-600" /><dt className="text-xs text-muted">Views</dt><dd className="font-bold text-brand-900">{book.total_views.toLocaleString()}</dd></div>
          <div className="soft-inset rounded-xl p-2"><BookOpen className="mx-auto h-4 w-4 text-brand-600" /><dt className="text-xs text-muted">Reads</dt><dd className="font-bold text-brand-900">{book.total_reads.toLocaleString()}</dd></div>
          <div className="soft-inset rounded-xl p-2"><Heart className="mx-auto h-4 w-4 text-pink" /><dt className="text-xs text-muted">Likes</dt><dd className="font-bold text-brand-900">{book.likes.toLocaleString()}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">{book.unique_viewers.toLocaleString()} unique viewers · {book.unique_readers.toLocaleString()} unique readers · {book.completed_reads.toLocaleString()} completed reads</p>
      </Card>)}</div>
      {pagination && pagination.pages > 1 && <nav className="mt-5 grid grid-cols-2 items-center gap-3 sm:flex sm:justify-between" aria-label="Book analytics pages"><p className="col-span-2 text-center text-sm text-muted sm:order-2 sm:col-auto">Page {pagination.page.toLocaleString()} of {pagination.pages.toLocaleString()}</p><Button className="w-full sm:order-1 sm:w-auto" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button className="w-full sm:order-3 sm:w-auto" variant="secondary" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
    </>}
  </div>;
}
