'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { booksApi } from '@/lib/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { ApiErrorShape, Book, ReadingLevel } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { BookAttribution } from '@/components/books/BookAttribution';

const READING_LEVELS: ReadingLevel[] = ['beginner', 'intermediate', 'advanced'];
const AGE_GROUPS = ['3-5', '6-8', '9-11', '12+'];

interface Filters {
  age_group: string;
  reading_level: string;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ age_group: '', reading_level: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBooks(null);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (filters.age_group) params.age_group = filters.age_group;
        if (filters.reading_level) params.reading_level = filters.reading_level;
        const res = await booksApi.list(params);
        if (!cancelled) setBooks(res.data.books);
      } catch (err) {
        if (!cancelled) setError((err as ApiErrorShape).message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div>
      <PageHeader eyebrow="Digital bookshelf" title="Books" icon={BookOpen} description="Browse the library and assign a title to a reading session." />

      <div className="mt-6 flex flex-wrap gap-3">
        <Select
          value={filters.age_group}
          onChange={(e) => setFilters({ ...filters, age_group: e.target.value })}
          className="w-full min-[420px]:w-40"
        >
          <option value="">All ages</option>
          {AGE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select
          value={filters.reading_level}
          onChange={(e) => setFilters({ ...filters, reading_level: e.target.value })}
          className="w-full min-[420px]:w-48"
        >
          <option value="">All reading levels</option>
          {READING_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {!books && !error && (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        {books && books.length === 0 && (
          <EmptyState title="No books match these filters" description="Try widening your search." />
        )}
        {books && books.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="sparkle-book-card card relative block overflow-hidden p-5 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                {book.cover_image_url && (
                  // External admin-provided image URLs cannot be allowlisted at build time for next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_image_url} alt="" loading="lazy" decoding="async" className="mb-4 h-32 w-full rounded-xl object-cover" />
                )}
                <h3 className="mb-2 text-base font-semibold text-brand-900">{book.title}</h3>
                <BookAttribution label={book.created_by_label} className="mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">{book.age_group}</Badge>
                  <Badge tone="neutral">{book.reading_level}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
