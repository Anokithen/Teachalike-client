'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ImagePlus, Save, Upload } from 'lucide-react';
import { teacherBooksApi } from '@/lib/endpoints';
import { ApiErrorShape, Book, ReadingLevel } from '@/lib/types';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';

interface Props { book?: Book; }

export function TeacherBookForm({ book }: Props) {
  const router = useRouter();
  const requestKey = useRef(crypto.randomUUID());
  const [title, setTitle] = useState(book?.title || '');
  const [description, setDescription] = useState(book?.description || '');
  const [ageGroup, setAgeGroup] = useState(book?.age_group || '6-8');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(book?.reading_level || 'beginner');
  const [textContent, setTextContent] = useState(book?.text_content || '');
  const [contentUrl, setContentUrl] = useState(book?.content_url || '');
  const [cover, setCover] = useState<File | null>(null);
  const [illustrations, setIllustrations] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | string[] | null>(null);

  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : book?.cover_image_url, [cover, book?.cover_image_url]);
  const illustrationPreviews = useMemo(
    () => illustrations.length ? illustrations.map((file) => URL.createObjectURL(file)) : (book?.image_urls || []),
    [illustrations, book?.image_urls],
  );
  useEffect(() => () => {
    if (cover && coverPreview) URL.revokeObjectURL(coverPreview);
    if (illustrations.length) illustrationPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [cover, coverPreview, illustrationPreviews, illustrations.length]);

  function validate() {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Book title is required.');
    if (title.trim().length > 200) errors.push('Book title must be 200 characters or fewer.');
    if (!ageGroup.trim()) errors.push('Age group is required.');
    if (!textContent.trim() && !contentUrl.trim()) errors.push('Add story text or a content URL.');
    if (illustrations.length > 8) errors.push('Choose no more than 8 illustrations.');
    return errors;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const errors = validate();
    if (errors.length) { setError(errors); return; }
    setSubmitting(true);
    setError(null);
    const data = new FormData();
    data.append('title', title.trim());
    data.append('description', description.trim());
    data.append('age_group', ageGroup.trim());
    data.append('reading_level', readingLevel);
    data.append('text_content', textContent.trim());
    data.append('content_url', contentUrl.trim());
    data.append('cover_image_url', book?.cover_image_url || '');
    data.append('video_url', book?.video_url || '');
    data.append('image_urls', JSON.stringify(book?.image_urls || []));
    if (cover) data.append('cover_image', cover);
    illustrations.forEach((file) => data.append('illustrations', file));
    if (video) data.append('video', video);
    try {
      if (book) await teacherBooksApi.update(book.id, data);
      else await teacherBooksApi.create(data, requestKey.current);
      window.sessionStorage.setItem('teacher-book-saved', book ? 'Book updated successfully.' : 'Book created successfully.');
      router.push('/teacher/books');
      router.refresh();
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Alert>{error}</Alert>
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-400/10"><BookOpen className="h-5 w-5 text-brand-600" aria-hidden="true" /></span>
          <div><h2 className="font-semibold text-brand-900">Book details</h2><p className="text-sm text-muted">These details appear throughout the TeachAlike library.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Book title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
          <Input label="Age group" value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)} maxLength={50} required />
          <Select label="Reading level" value={readingLevel} onChange={(event) => setReadingLevel(event.target.value as ReadingLevel)} required>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </Select>
          <Input label="Content URL (optional)" type="url" value={contentUrl} onChange={(event) => setContentUrl(event.target.value)} placeholder="https://…" />
        </div>
        <div className="mt-4 space-y-4">
          <Textarea label="Description" value={description || ''} onChange={(event) => setDescription(event.target.value)} maxLength={5000} />
          <Textarea label="Story or page content" value={textContent} onChange={(event) => setTextContent(event.target.value)} className="min-h-64" />
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center gap-3"><ImagePlus className="h-5 w-5 text-brand-600" aria-hidden="true" /><div><h2 className="font-semibold text-brand-900">Book media</h2><p className="text-sm text-muted">Images are checked before being stored in the book’s server-owned Cloudinary folder.</p></div></div>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block"><span className="label">Cover image</span><input className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-400/10 file:px-3 file:py-1 file:text-brand-700" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCover(event.target.files?.[0] || null)} /></label>
          <label className="block"><span className="label">Illustrations (up to 8)</span><input className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-400/10 file:px-3 file:py-1 file:text-brand-700" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setIllustrations(Array.from(event.target.files || []))} /></label>
          <label className="block"><span className="label">Story video (optional)</span><input className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-400/10 file:px-3 file:py-1 file:text-brand-700" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => setVideo(event.target.files?.[0] || null)} /></label>
        </div>
        {(coverPreview || illustrationPreviews.length > 0) && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Selected image previews">
          {coverPreview && <div><p className="mb-1 text-xs font-semibold text-muted">Cover</p><img src={coverPreview} alt="Cover preview" className="h-28 w-full rounded-xl object-cover" /></div>}
          {illustrationPreviews.map((url, index) => <div key={url}><p className="mb-1 text-xs font-semibold text-muted">Page {index + 1}</p><img src={url} alt={`Illustration ${index + 1} preview`} className="h-28 w-full rounded-xl object-cover" /></div>)}
        </div>}
        {video && <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted"><Upload className="h-4 w-4" />Ready to upload {video.name}</p>}
      </Card>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" disabled={submitting} onClick={() => router.push('/teacher/books')}>Cancel</Button>
        <Button type="submit" loading={submitting} disabled={submitting}><Save className="h-4 w-4" aria-hidden="true" />{submitting ? 'Uploading and saving…' : book ? 'Save changes' : 'Create book'}</Button>
      </div>
    </form>
  );
}
