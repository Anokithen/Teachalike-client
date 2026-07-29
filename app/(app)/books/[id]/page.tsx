'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Pencil,
  Play,
  Puzzle,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { adminApi, bookNarrationsApi, booksApi, childrenApi, voiceProfilesApi, sessionsApi } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChildPinModal } from '@/components/children/ChildPinModal';
import { BookEditModal } from '@/components/books/BookEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiErrorShape, Book, BookNarration, Child, MiniGame, VoiceProfile } from '@/lib/types';

const GAME_DETAILS: Record<string, { icon: LucideIcon; goal: string; description: string }> = {
  word_puzzle: { icon: Puzzle, goal: 'Word builder', description: 'Put mixed-up letters in the right order to build book words.' },
  spelling: { icon: Pencil, goal: 'Spelling practice', description: 'Type important words from the story carefully and correctly.' },
  quiz: { icon: Sparkles, goal: 'Story word quiz', description: 'Choose words you remember from the book to check your understanding.' },
};

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [miniGames, setMiniGames] = useState<MiniGame[] | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [narrations, setNarrations] = useState<BookNarration[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [childId, setChildId] = useState('');
  const [pendingChild, setPendingChild] = useState<Child | null>(null);
  const [voiceProfileId, setVoiceProfileId] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | string[] | null>(null);
  const [narrationVoiceId, setNarrationVoiceId] = useState('');
  const [creatingNarration, setCreatingNarration] = useState(false);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | string[] | null>(null);
  const narrationAudio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bookRes, gamesRes, childrenRes, narrationsRes] = await Promise.all([
          booksApi.get(id),
          booksApi.miniGames(id),
          childrenApi.list(),
          bookNarrationsApi.list(id),
        ]);
        setBook(bookRes.data.book);
        setMiniGames(gamesRes.data.mini_games);
        setChildren(childrenRes.data.children);
        setNarrations(narrationsRes.data.book_narrations);
      } catch (err) {
        setError((err as ApiErrorShape).message);
      }
      try {
        const vpRes = await voiceProfilesApi.list();
        setVoiceProfiles(vpRes.data.voice_profiles.filter((v: VoiceProfile) => v.status === 'ready'));
      } catch (err) {
        // voice profiles are optional — ignore failure here
      }
    }
    load();
  }, [id]);

  useEffect(() => setImageIndex(0), [id]);

  const selectedNarration = narrations.find((narration) => String(narration.voice_profile_id) === narrationVoiceId) || null;
  const storyImages = [book?.cover_image_url, ...(book?.image_urls || [])].filter(Boolean) as string[];

  useEffect(() => {
    if (selectedNarration?.status !== 'processing') return;
    const poll = async () => {
      try {
        const response = await bookNarrationsApi.status(selectedNarration.id);
        setNarrations((previous) => previous.map((narration) => narration.id === selectedNarration.id ? response.data : narration));
      } catch (err) {
        setNarrationError((err as ApiErrorShape).message);
      }
    };
    void poll();
    const interval = window.setInterval(() => { void poll(); }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedNarration?.id, selectedNarration?.status]);

  useEffect(() => () => {
    if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
  }, [narrationAudioUrl]);

  async function createNarration() {
    if (!narrationVoiceId) {
      setNarrationError('Choose a ready voice profile first.');
      return;
    }
    setNarrationError(null);
    setCreatingNarration(true);
    try {
      const response = await bookNarrationsApi.create(id, { voice_profile_id: Number(narrationVoiceId) });
      const narration = response.data.book_narration as BookNarration;
      setNarrations((previous) => {
        const withoutCurrent = previous.filter((item) => item.id !== narration.id);
        return [narration, ...withoutCurrent];
      });
    } catch (err) {
      setNarrationError((err as ApiErrorShape).message);
    } finally {
      setCreatingNarration(false);
    }
  }

  async function loadNarrationAudio() {
    if (!selectedNarration) return;
    narrationAudio.current?.pause();
    if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
    setNarrationAudioUrl(null);
    setNarrationError(null);
    try {
      const response = await bookNarrationsApi.audio(selectedNarration.id);
      setNarrationAudioUrl(URL.createObjectURL(response.data));
    } catch (err) {
      setNarrationError((err as ApiErrorShape).message);
    }
  }

  async function deleteBook() {
    setActionError(null);
    setDeleting(true);
    try {
      await adminApi.deleteBook(id);
      router.push('/books');
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setActionError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setDeleting(false);
    }
  }

  async function onStartSession(e: FormEvent) {
    e.preventDefault();
    setStartError(null);
    if (!childId) {
      setStartError('Choose a child to start this session for.');
      return;
    }
    setStarting(true);
    try {
      const payload: { child_id: number; book_id: number; voice_profile_id?: number } = {
        child_id: Number(childId),
        book_id: Number(id),
      };
      if (voiceProfileId) payload.voice_profile_id = Number(voiceProfileId);
      const res = await sessionsApi.create(payload);
      router.push(`/reading-sessions/${res.data.reading_session.id}`);
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setStartError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
    } finally {
      setStarting(false);
    }
  }

  function selectChild(value: string) {
    if (!value) {
      setChildId('');
      setPendingChild(null);
      return;
    }
    const selected = children?.find((child) => String(child.id) === value) || null;
    setChildId('');
    if (selected?.has_pin) setPendingChild(selected);
    else setPendingChild(null);
    if (selected && !selected.has_pin) setChildId(String(selected.id));
  }

  if (error) return <Alert>{error}</Alert>;
  if (!book) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div>
      <Link href="/books" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All books
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-semibold text-brand-900">{book.title}</h1>
          <div className="mt-2 flex gap-2">
            <Badge tone="brand">{book.age_group}</Badge>
            <Badge tone="neutral">{book.reading_level}</Badge>
          </div>
          {isAdmin && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit book
              </Button>
              <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete book
              </Button>
            </div>
          )}
        </div>
        {storyImages.length > 0 && (
          <div className="w-full max-w-sm sm:w-72">
            <div className="relative overflow-hidden rounded-3xl border border-brand-400/20 bg-brand-400/10 p-2 shadow-card">
              {/* External admin-provided image URLs cannot be allowlisted at build time for next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={storyImages[imageIndex]} src={storyImages[imageIndex]} alt={`Illustration ${imageIndex + 1} for ${book.title}`} className="story-gallery-image h-48 w-full rounded-2xl object-cover sm:h-56" />
              <Sparkles className="reading-sparkle absolute right-4 top-3 h-6 w-6 text-amber-300" aria-hidden="true" />
              {storyImages.length > 1 && <>
                <button type="button" aria-label="Previous book image" onClick={() => setImageIndex((index) => (index - 1 + storyImages.length) % storyImages.length)} className="absolute left-4 top-1/2 rounded-full bg-white/90 p-2 text-brand-900 shadow transition hover:scale-110"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                <button type="button" aria-label="Next book image" onClick={() => setImageIndex((index) => (index + 1) % storyImages.length)} className="absolute right-4 top-1/2 rounded-full bg-white/90 p-2 text-brand-900 shadow transition hover:scale-110"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
              </>}
            </div>
            {storyImages.length > 1 && <div className="mt-2 flex justify-center gap-1.5" aria-label="Book image selector">{storyImages.map((image, index) => <button type="button" key={image} aria-label={`Show image ${index + 1}`} onClick={() => setImageIndex(index)} className={`h-2 rounded-full transition-all ${index === imageIndex ? 'w-6 bg-brand-600' : 'w-2 bg-brand-400/40'}`} />)}</div>}
          </div>
        )}
      </div>

      {actionError && (
        <div className="mt-4">
          <Alert>{actionError}</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-brand-900">Preview</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#154767] dark:text-[#65adb2]">
            {book.text_content || 'No preview text available for this book.'}
          </p>
          <div className="mt-6 rounded-2xl border border-violet-300 bg-violet-50/60 p-4">
            <h3 className="text-sm font-semibold text-brand-900">Listen in a familiar voice</h3>
            <p className="mt-1 text-xs text-muted">The first listen generates and privately saves the ElevenLabs narration. Later listens reuse that saved audio for the same book and voice profile.</p>
            {voiceProfiles.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Create a ready voice clone first to use this option.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <Select label="Voice profile" value={narrationVoiceId} onChange={(event) => {
                  setNarrationVoiceId(event.target.value);
                  setNarrationError(null);
                  if (narrationAudioUrl) {
                    URL.revokeObjectURL(narrationAudioUrl);
                    setNarrationAudioUrl(null);
                  }
                }}>
                  <option value="">Choose a familiar voice</option>
                  {voiceProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label || `Voice profile #${profile.id}`}</option>)}
                </Select>
                {!selectedNarration && <Button type="button" onClick={createNarration} loading={creatingNarration} disabled={!narrationVoiceId}><Volume2 className="h-4 w-4" aria-hidden="true" />Generate and listen</Button>}
                {selectedNarration?.status === 'processing' && <div className="flex items-center gap-2 text-sm text-brand-700"><Spinner size={16} /> Generating narration… This can take a few minutes.</div>}
                {selectedNarration?.status === 'failed' && <div className="space-y-2"><Alert>{selectedNarration.error_message || 'Narration generation failed.'}</Alert><Button type="button" onClick={createNarration} loading={creatingNarration}><RotateCcw className="h-4 w-4" aria-hidden="true" />Retry narration</Button></div>}
                {selectedNarration?.status === 'ready' && <div className="space-y-3"><Button type="button" variant="ghost" onClick={loadNarrationAudio}><Play className="h-4 w-4" aria-hidden="true" />Listen to saved narration</Button>{narrationAudioUrl && <audio ref={narrationAudio} key={narrationAudioUrl} className="w-full" controls controlsList="nodownload" autoPlay preload="metadata" src={narrationAudioUrl} onContextMenu={(event) => event.preventDefault()}>Your browser cannot play this narration.</audio>}</div>}
              </div>
            )}
            {narrationError && <div className="mt-3"><Alert>{narrationError}</Alert></div>}
          </div>
          {book.video_url && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-brand-400/20 bg-brand-400/5 p-3">
              <p className="mb-2 text-sm font-semibold text-brand-900">Watch the story</p>
              <video controls preload="metadata" src={book.video_url} className="w-full rounded-xl" />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-brand-900">Start a reading session</h2>
          <form onSubmit={onStartSession} className="space-y-4">
            <Select label="Child" value={childId} onChange={(e) => selectChild(e.target.value)}>
              <option value="">Choose a child</option>
              {children?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {voiceProfiles.length > 0 && (
              <Select
                label="Voice (optional)"
                value={voiceProfileId}
                onChange={(e) => setVoiceProfileId(e.target.value)}
              >
                <option value="">Default narration</option>
                {voiceProfiles.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.label || `Voice profile #${vp.id}`}
                  </option>
                ))}
              </Select>
            )}
            <Alert>{startError}</Alert>
            <Button type="submit" loading={starting} className="w-full">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Start reading session
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-brand-900">Linked mini-games</h2>
        {miniGames && miniGames.length === 0 && (
          <EmptyState title="No mini-games linked to this book yet" />
        )}
        {miniGames && miniGames.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {miniGames.map((g) => {
              const GameIcon = GAME_DETAILS[g.game_type]?.icon || Gamepad2;
              return (
                <Link
                  key={g.id}
                  href={`/mini-games/${g.id}`}
                  className="sparkle-book-card card block p-5 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <GameIcon className="mb-3 h-6 w-6 text-brand-600" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-brand-900">{GAME_DETAILS[g.game_type]?.goal || g.game_type?.replace(/_/g, ' ')}</h3>
                  <p className="mt-1 min-h-10 text-sm text-muted">{GAME_DETAILS[g.game_type]?.description || 'Complete the activity to practise this book.'}</p>
                  <div className="mt-3 flex items-center justify-between"><Badge tone="neutral" className="capitalize">{g.difficulty}</Badge><span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">Play <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <ChildPinModal child={pendingChild} onClose={() => setPendingChild(null)} onVerified={(child) => setChildId(String(child.id))} />
      {isAdmin && (
        <>
          <BookEditModal
            book={book}
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onUpdated={(updatedBook) => setBook(updatedBook)}
          />
          <ConfirmDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={deleteBook}
            loading={deleting}
            title={`Delete ${book.title}?`}
            description="This permanently removes the book and its linked mini-games. This action cannot be undone."
            confirmLabel="Delete book"
          />
        </>
      )}
    </div>
  );
}
