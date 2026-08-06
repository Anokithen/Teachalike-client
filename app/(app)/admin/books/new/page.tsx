'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { LibraryBig, Sparkles } from 'lucide-react';
import { adminApi, aiApi } from '@/lib/endpoints';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { AiModel, ApiErrorShape, ReadingLevel } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';
import { PageHeader } from '@/components/ui/PageHeader';

const AGE_GROUPS = ['3-5', '6-8', '9-11', '12+'];

export default function NewBookPage() {
  const [form, setForm] = useState({
    title: '', description: '', age_group: '3-5', reading_level: 'beginner' as ReadingLevel, text_content: '', content_url: '', cover_image_url: '', video_url: '',
  });
  const [error, setError] = useState<string | string[] | null>(null);
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [storyIdea, setStoryIdea] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [illustrationFiles, setIllustrationFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState('');
  const [aiModelsLoading, setAiModelsLoading] = useState(true);
  const [aiModelsError, setAiModelsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    aiApi.models()
      .then((response) => {
        if (!mounted) return;
        const models = (response.data.models || []) as AiModel[];
        setAiModels(models);
        setSelectedAiModel(response.data.default_model || models[0]?.id || '');
      })
      .catch((err) => {
        if (mounted) setAiModelsError((err as ApiErrorShape).message || 'Could not load Groq models.');
      })
      .finally(() => {
        if (mounted) setAiModelsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  function onMediaFileChange(file: File | undefined, mediaType: 'image' | 'video', setFile: (value: File | null) => void, input: HTMLInputElement) {
    setError(null);
    if (!file) return setFile(null);
    if (!isAllowedUploadFile(file, mediaType)) {
      input.value = '';
      setFile(null);
      setError(uploadFormatError(mediaType));
      return;
    }
    setFile(file);
  }

  function onIllustrationFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(event.target.files || []);
    if (files.some((file) => !isAllowedUploadFile(file, 'image'))) {
      event.target.value = '';
      setIllustrationFiles([]);
      setError(uploadFormatError('image'));
      return;
    }
    setIllustrationFiles(files.slice(0, 8));
  }

  function resetBookForm() {
    setForm({ title: '', description: '', age_group: '3-5', reading_level: 'beginner', text_content: '', content_url: '', cover_image_url: '', video_url: '' });
    setCoverFile(null);
    setIllustrationFiles([]);
    setVideoFile(null);
    setMediaInputKey((value) => value + 1);
  }

  async function generateStory() {
    setError(null);
    if (!storyIdea.trim()) {
      setError('Write a story prompt first so the AI knows what to create.');
      return;
    }
    setGenerating(true);
    try {
      const response = await adminApi.generateBookDraft({ age_group: form.age_group, reading_level: form.reading_level, idea: storyIdea, model: selectedAiModel || undefined });
      const data = response.data as {
        draft?: { title?: string; text_content?: string; text?: string };
        title?: string;
        text_content?: string;
        text?: string;
      };
      // The Flask API wraps the draft, while the former Next API route returned
      // it directly. Support both while deployments transition between them.
      const draft = data.draft || data;
      const generatedText = draft.text_content || draft.text || '';
      if (!generatedText.trim()) throw new Error('The AI did not return any book text. Please try again.');
      setForm((current) => ({ ...current, title: draft.title || current.title, text_content: generatedText }));
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setError(apiErr.message || (err instanceof Error ? err.message : 'Could not make a story draft.'));
    }
    finally { setGenerating(false); }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedBookId(null);
    setLoading(true);
    let savedBookId: number | null = null;
    try {
      setUploadStatus('Saving book and creating games…');
      const res = await adminApi.createBook({
        ...form,
        cover_image_url: coverFile ? '' : form.cover_image_url,
        image_urls: [],
        video_url: videoFile ? '' : form.video_url,
      });
      const bookId = res.data.book.id as number;
      savedBookId = bookId;
      setCreatedBookId(bookId);

      if (coverFile) {
        setUploadStatus('Uploading cover image…');
        const media = new FormData();
        media.append('file', coverFile);
        media.append('image_kind', 'cover');
        await adminApi.uploadBookImage(bookId, media);
      }
      for (const [index, file] of illustrationFiles.entries()) {
        setUploadStatus(`Uploading illustration ${index + 1} of ${illustrationFiles.length}…`);
        const media = new FormData();
        media.append('file', file);
        media.append('image_kind', 'picture');
        media.append('position', String(index + 1));
        await adminApi.uploadBookImage(bookId, media);
      }

      if (videoFile) {
        setUploadStatus('Uploading video…');
        const video = new FormData();
        video.append('file', videoFile);
        await adminApi.uploadBookVideo(bookId, video);
      }

      resetBookForm();
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      if (savedBookId) {
        // The book transaction already succeeded. Clear the form so retrying
        // the failed video upload cannot accidentally create a duplicate book.
        resetBookForm();
        setError(
          `Book #${savedBookId} was created, but its video could not be uploaded. ${
            apiErr.message || 'You can add a video URL when editing the book.'
          }`,
        );
      } else {
        setError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
      }
    } finally {
      setLoading(false);
      setUploadStatus(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Library studio" title="Add a book" icon={LibraryBig} description="Each new book automatically receives word puzzle, spelling, and an AI-generated story word quiz based on its content." />
      <Card className="sparkle-book-card mt-6 overflow-hidden">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-2xl bg-brand-400/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Story starter
            </p>
            <p className="mt-1 text-xs text-muted">Describe the characters, setting, lesson, and adventure you want. Groq fills the title and story text for you.</p>
            <div className="mt-3 space-y-2">
              <Textarea label="AI story prompt" value={storyIdea} onChange={(e) => setStoryIdea(e.target.value)} placeholder="Example: A brave fox helps a lost bird find its family in a glowing forest." />
              <Select label="Groq AI model" value={selectedAiModel} onChange={(e) => setSelectedAiModel(e.target.value)} disabled={aiModelsLoading || aiModels.length === 0}>
                {aiModels.length === 0 && <option value="">{aiModelsLoading ? 'Loading available models…' : 'No Groq models available'}</option>}
                {aiModels.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}
              </Select>
              <p className="text-xs text-muted">
                {aiModelsError || (aiModelsLoading ? 'Loading the current model list from Groq…' : 'This list comes from Groq’s active models.')}
              </p>
              <Button type="button" variant="secondary" loading={generating} onClick={generateStory}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate book
              </Button>
            </div>
          </div>
          <Input label="Book title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={5000} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Age group" value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })}>
              {AGE_GROUPS.map((age) => <option key={age} value={age}>{age}</option>)}
            </Select>
            <Select label="Reading level" value={form.reading_level} onChange={(e) => setForm({ ...form, reading_level: e.target.value as ReadingLevel })}>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </Select>
          </div>
          <Textarea label="Book text" required value={form.text_content} onChange={(e) => setForm({ ...form, text_content: e.target.value })} placeholder="Paste or write the story text used to build the games." />
          <div className="rounded-2xl border border-brand-400/20 bg-brand-400/5 p-4">
            <p className="text-sm font-semibold text-brand-900">Book media <span className="font-normal text-muted">(optional)</span></p>
            <p className="mt-1 text-xs text-muted">After Groq creates the story, add a cover image, up to 8 illustrations, and an optional video. Uploaded files are stored in Cloudinary.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Input label="Cover image URL" type="url" placeholder="https://…/cover.jpg" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
              <Input label="Video URL" type="url" placeholder="https://…/story-video.mp4" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
              <div><label className="label">Or upload a cover image</label><input key={`cover-${mediaInputKey}`} className="input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => onMediaFileChange(e.target.files?.[0], 'image', setCoverFile, e.target)} /></div>
              <div className="sm:col-span-2"><label className="label">Story illustrations (up to 8)</label><input key={`illustrations-${mediaInputKey}`} className="input" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onIllustrationFilesChange} /><p className="mt-1 text-xs text-muted">These appear as an animated gallery on the book profile and reading screen.</p>{illustrationFiles.length > 0 && <p className="mt-1 text-xs font-medium text-brand-700">{illustrationFiles.length} illustration{illustrationFiles.length === 1 ? '' : 's'} selected.</p>}</div>
              <div><label className="label">Or upload a video</label><input key={`video-${mediaInputKey}`} className="input" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(e) => onMediaFileChange(e.target.files?.[0], 'video', setVideoFile, e.target)} /></div>
            </div>
          </div>
          <Input label="Reading resource URL (optional)" type="url" value={form.content_url} onChange={(e) => setForm({ ...form, content_url: e.target.value })} />
          <Alert>{error}</Alert>
          {uploadStatus && <p className="text-sm font-medium text-brand-700" role="status">{uploadStatus}</p>}
          {createdBookId && <Alert tone="success">Book and its three mini-games are ready. <Link className="font-medium underline" href={`/books/${createdBookId}`}>Open book</Link></Alert>}
          <Button type="submit" loading={loading} className="w-full">Create book and games</Button>
        </form>
      </Card>
    </div>
  );
}
