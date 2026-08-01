'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { adminApi, booksApi } from '@/lib/endpoints';
import { ApiErrorShape, Book, ReadingLevel } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';

interface BookEditModalProps {
  book: Book;
  open: boolean;
  onClose: () => void;
  onUpdated: (book: Book) => void;
}

interface BookForm {
  title: string;
  description: string;
  age_group: string;
  reading_level: ReadingLevel;
  text_content: string;
  content_url: string;
  cover_image_url: string;
  image_urls: string;
  video_url: string;
}

const MAX_ILLUSTRATIONS = 8;

function formFromBook(book: Book): BookForm {
  return {
    title: book.title || '',
    description: book.description || '',
    age_group: book.age_group || '',
    reading_level: book.reading_level || 'beginner',
    text_content: book.text_content || '',
    content_url: book.content_url || '',
    cover_image_url: book.cover_image_url || '',
    image_urls: (book.image_urls || []).join('\n'),
    video_url: book.video_url || '',
  };
}

export function BookEditModal({ book, open, onClose, onUpdated }: BookEditModalProps) {
  const [form, setForm] = useState<BookForm>(() => formFromBook(book));
  const [illustrationFiles, setIllustrationFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [mediaInputKey, setMediaInputKey] = useState(0);

  useEffect(() => {
    if (open) {
      setForm(formFromBook(book));
      setIllustrationFiles([]);
      setError(null);
      setUploadStatus(null);
    }
  }, [book, open]);

  function close() {
    if (saving) return;
    setError(null);
    onClose();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const imageUrls = form.image_urls
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean);
      if (imageUrls.length + illustrationFiles.length > MAX_ILLUSTRATIONS) {
        setError(`A book can have up to ${MAX_ILLUSTRATIONS} illustrations.`);
        setSaving(false);
        return;
      }
      if (illustrationFiles.some((file) => !isAllowedUploadFile(file, 'image'))) {
        setError(uploadFormatError('image'));
        setSaving(false);
        return;
      }
      const response = await adminApi.updateBook(book.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        age_group: form.age_group.trim(),
        reading_level: form.reading_level,
        text_content: form.text_content,
        content_url: form.content_url.trim(),
        cover_image_url: form.cover_image_url.trim(),
        image_urls: imageUrls,
        video_url: form.video_url.trim(),
      });
      let updatedBook = response.data.book as Book;
      for (const [index, file] of illustrationFiles.entries()) {
        setUploadStatus(`Uploading illustration ${index + 1} of ${illustrationFiles.length}…`);
        const media = new FormData();
        media.append('file', file);
        media.append('image_kind', 'picture');
        media.append('position', String(imageUrls.length + index + 1));
        await adminApi.uploadBookImage(book.id, media);
      }
      if (illustrationFiles.length) {
        updatedBook = (await booksApi.get(book.id)).data.book as Book;
      }
      onUpdated(updatedBook);
      setIllustrationFiles([]);
      setMediaInputKey((value) => value + 1);
      onClose();
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setSaving(false);
      setUploadStatus(null);
    }
  }

  return (
    <Modal open={open} onClose={close} title={`Edit ${book.title}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          maxLength={5000}
        />
        <Input
          label="Age group"
          required
          placeholder="e.g. 6–8"
          value={form.age_group}
          onChange={(event) => setForm({ ...form, age_group: event.target.value })}
        />
        <Select
          label="Reading level"
          value={form.reading_level}
          onChange={(event) => setForm({ ...form, reading_level: event.target.value as ReadingLevel })}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Textarea
          label="Story text"
          rows={8}
          value={form.text_content}
          onChange={(event) => setForm({ ...form, text_content: event.target.value })}
        />
        <Input
          label="Content URL (optional)"
          type="url"
          value={form.content_url}
          onChange={(event) => setForm({ ...form, content_url: event.target.value })}
        />
        <Input
          label="Cover image URL (optional)"
          type="url"
          value={form.cover_image_url}
          onChange={(event) => setForm({ ...form, cover_image_url: event.target.value })}
        />
        <Textarea
          label="Illustration URLs (one per line)"
          rows={4}
          value={form.image_urls}
          onChange={(event) => setForm({ ...form, image_urls: event.target.value })}
        />
        <div>
          <label htmlFor="book-illustrations" className="label">Add illustration images</label>
          <input
            id="book-illustrations"
            key={mediaInputKey}
            className="input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.some((file) => !isAllowedUploadFile(file, 'image'))) {
                event.target.value = '';
                setIllustrationFiles([]);
                setError(uploadFormatError('image'));
                return;
              }
              setError(null);
              setIllustrationFiles(files);
            }}
          />
          <p className="mt-1 text-xs text-muted">Select multiple JPG, PNG, or WebP files. They will be added to the existing illustrations when you save.</p>
          {illustrationFiles.length > 0 && (
            <p className="mt-1 text-xs font-medium text-brand-700" role="status">
              {illustrationFiles.length} new illustration{illustrationFiles.length === 1 ? '' : 's'} selected.
            </p>
          )}
        </div>
        <Input
          label="Video URL (optional)"
          type="url"
          value={form.video_url}
          onChange={(event) => setForm({ ...form, video_url: event.target.value })}
        />
        <Alert>{error}</Alert>
        {uploadStatus && <p className="text-sm font-medium text-brand-700" role="status">{uploadStatus}</p>}
        <div className="flex flex-col-reverse justify-end gap-3 pt-1 sm:flex-row">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
