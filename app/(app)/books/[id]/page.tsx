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
  Eye,
  Heart,
  Pencil,
  Play,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { adminApi, bookNarrationsApi, booksApi, voiceProfilesApi, sessionsApi } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookEditModal } from '@/components/books/BookEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiErrorShape, Book, BookEngagement, BookNarration, MiniGame, MiniGameGenerationStatusResponse, VoiceProfile } from '@/lib/types';
import { useActiveChild } from '@/lib/active-child-context';
import { BookAttribution } from '@/components/books/BookAttribution';

const GAME_DETAILS: Record<string, { icon: LucideIcon; goal: string; description: string }> = {
  word_puzzle: { icon: Puzzle, goal: 'Word builder', description: 'Put mixed-up letters in the right order to build book words.' },
  spelling: { icon: Pencil, goal: 'Spelling practice', description: 'Type important words from the story carefully and correctly.' },
  quiz: { icon: Sparkles, goal: 'Story word quiz', description: 'Choose words you remember from the book to check your understanding.' },
};

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { activeChild } = useActiveChild();

  const [book, setBook] = useState<Book | null>(null);
  const [miniGames, setMiniGames] = useState<MiniGame[] | null>(null);
  const [generationStatus, setGenerationStatus] = useState<MiniGameGenerationStatusResponse | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [narrations, setNarrations] = useState<BookNarration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<BookEngagement | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);
  const viewRequested = useRef(false);

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
        const [bookRes, gamesRes, narrationsRes] = await Promise.all([
          booksApi.get(id),
          booksApi.miniGames(id),
          bookNarrationsApi.list(id),
        ]);
        setBook(bookRes.data.book);
        setMiniGames(gamesRes.data.mini_games);
        setNarrations(narrationsRes.data.book_narrations);
        try {
          const statusRes = await booksApi.miniGameGenerationStatus(id);
          setGenerationStatus(statusRes.data);
        } catch {
          // The games remain playable if the optional manager status is unavailable.
        }
        if (!viewRequested.current) {
          viewRequested.current = true;
          try { await booksApi.recordView(id); } catch { /* Engagement still loads if view recording is temporarily unavailable. */ }
        }
        const engagementRes = await booksApi.engagement(id);
        setEngagement(engagementRes.data);
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

  async function regenerateMiniGames() {
    setRegenerating(true);
    setGenerationError(null);
    try {
      await booksApi.regenerateMiniGames(id);
      const [gamesRes, statusRes] = await Promise.all([
        booksApi.miniGames(id),
        booksApi.miniGameGenerationStatus(id),
      ]);
      setMiniGames(gamesRes.data.mini_games);
      setGenerationStatus(statusRes.data);
    } catch (err) {
      setGenerationError((err as ApiErrorShape).message || 'We could not prepare new games just now. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => {
    if (!book) return;
    let active = true;
    booksApi.engagement(id, activeChild?.id).then((response) => {
      if (active) setEngagement(response.data);
    }).catch((err) => {
      if (active) setLikeError((err as ApiErrorShape).message);
    });
    return () => { active = false; };
  }, [book, activeChild, id]);

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
    if (!activeChild) {
      setStartError('Choose a child from the header before starting this activity.');
      return;
    }
    setStarting(true);
    try {
      const payload: { book_id: number; voice_profile_id?: number } = { book_id: Number(id) };
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

  async function toggleLike() {
    if (!activeChild) {
      setLikeError('Choose and verify a child from the header before liking this book.');
      return;
    }
    if (!engagement) return;
    setLikeLoading(true);
    setLikeError(null);
    try {
      if (engagement.liked_by_child) await booksApi.unlike(id, activeChild.id);
      else await booksApi.like(id, activeChild.id);
      setEngagement((current) => current ? {
        ...current,
        likes: Math.max(0, current.likes + (current.liked_by_child ? -1 : 1)),
        liked_by_child: !current.liked_by_child,
      } : current);
    } catch (err) {
      setLikeError((err as ApiErrorShape).message);
    } finally {
      setLikeLoading(false);
    }
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
          <BookAttribution label={book.created_by_label} className="mt-2" />
          {book.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{book.description}</p>}
          <div className="mt-2 flex gap-2">
            <Badge tone="brand">{book.age_group}</Badge>
            <Badge tone="neutral">{book.reading_level}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-3" aria-label="Book engagement">
            <span className="soft-inset inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-brand-900"><Eye className="h-4 w-4 text-brand-600" aria-hidden="true" />{(engagement?.total_views ?? 0).toLocaleString()} views</span>
            <span className="soft-inset inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-brand-900"><BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />{(engagement?.total_reads ?? 0).toLocaleString()} reads</span>
            <span className="soft-inset inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-brand-900"><Heart className="h-4 w-4 text-pink" aria-hidden="true" />{(engagement?.likes ?? 0).toLocaleString()} likes</span>
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
                <button type="button" aria-label="Previous book image" onClick={() => setImageIndex((index) => (index - 1 + storyImages.length) % storyImages.length)} className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-900 shadow transition hover:scale-105 sm:left-4"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                <button type="button" aria-label="Next book image" onClick={() => setImageIndex((index) => (index + 1) % storyImages.length)} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-900 shadow transition hover:scale-105 sm:right-4"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
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
            <p className="rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand-800">{activeChild ? `Reading as ${activeChild.name}` : 'Choose a child from the header before starting this activity.'}</p>
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
            {!isAdmin && <div className="rounded-2xl border border-pink/25 bg-pink/5 p-3">
              <Button type="button" variant={engagement?.liked_by_child ? 'secondary' : 'ghost'} loading={likeLoading} disabled={!activeChild || !engagement} onClick={toggleLike} className="w-full" aria-label="Like this book for the active child" aria-pressed={Boolean(engagement?.liked_by_child)}>
                <Heart className={`h-5 w-5 ${engagement?.liked_by_child ? 'fill-pink text-pink' : 'text-pink'}`} aria-hidden="true" />
                {engagement?.liked_by_child ? 'Unlike this book' : 'Like this book'}
              </Button>
              {!activeChild && <p className="mt-2 text-center text-xs text-muted">Choose and verify a child from the header to like books.</p>}
              {likeError && <div className="mt-2"><Alert>{likeError}</Alert></div>}
            </div>}
            <Button type="submit" loading={starting} className="w-full">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Start reading session
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-900">Linked mini-games</h2>
            <p className="mt-1 text-xs text-muted">Story challenges are prepared from this book&apos;s saved text.</p>
          </div>
          {generationStatus?.can_regenerate && (
            <Button variant="secondary" loading={regenerating} onClick={regenerateMiniGames}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Regenerate questions
            </Button>
          )}
        </div>
        {generationError && <div className="mb-4"><Alert>{generationError}</Alert></div>}
        {generationStatus?.mini_games.some((game) => game.generation_status === 'generating' || game.generation_status === 'pending') && (
          <div className="mb-4"><Alert>We&apos;re preparing fun story challenges. They will be ready soon.</Alert></div>
        )}
        {miniGames && miniGames.length === 0 && (
          <EmptyState title="No mini-games linked to this book yet" />
        )}
        {miniGames && miniGames.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {miniGames.map((g) => {
              const GameIcon = GAME_DETAILS[g.game_type]?.icon || Gamepad2;
              const playable = g.generation_status === 'ready' || g.generation_status === 'fallback' || !g.generation_status;
              const card = (
                <>
                  <GameIcon className="mb-3 h-6 w-6 text-brand-600" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-brand-900">{GAME_DETAILS[g.game_type]?.goal || g.game_type?.replace(/_/g, ' ')}</h3>
                  <p className="mt-1 min-h-10 text-sm text-muted">{GAME_DETAILS[g.game_type]?.description || 'Complete the activity to practise this book.'}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="neutral" className="capitalize">{g.difficulty}</Badge>
                      {g.generation_status === 'fallback' && <Badge tone="warning">Story game ready</Badge>}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                      {playable ? 'Play' : 'Preparing'}
                      {playable && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                  </div>
                </>
              );
              return playable ? (
                <Link key={g.id} href={`/mini-games/${g.id}`} className="sparkle-book-card card block p-5 transition-all hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300">
                  {card}
                </Link>
              ) : (
                <div key={g.id} className="card block p-5 opacity-80" aria-label={`${GAME_DETAILS[g.game_type]?.goal || g.game_type} is being prepared`}>
                  {card}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
