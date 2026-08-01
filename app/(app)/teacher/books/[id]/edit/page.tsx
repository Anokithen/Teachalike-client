'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { teacherBooksApi } from '@/lib/endpoints';
import { ApiErrorShape, Book } from '@/lib/types';
import { TeacherBookForm } from '@/components/books/TeacherBookForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';

export default function EditTeacherBookPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { teacherBooksApi.get(id).then((response) => setBook(response.data.book)).catch((err) => setError((err as ApiErrorShape).message)); }, [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!book) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  return <div><PageHeader eyebrow="Teacher library" title={`Edit ${book.title}`} icon={Pencil} description="Update your story and its media. Only you and administrators can manage this book." /><div className="mt-6"><TeacherBookForm book={book} /></div></div>;
}
