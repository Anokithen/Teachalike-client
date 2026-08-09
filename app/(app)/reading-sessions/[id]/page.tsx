'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mic2,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import { bookNarrationsApi, booksApi, sessionsApi, voiceProfilesApi } from '@/lib/endpoints';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiErrorShape, Book, BookNarration, PronunciationCheck, ReadingSession, SessionFeedback, VoiceProfile } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';
import { BookAttribution } from '@/components/books/BookAttribution';
import { PronunciationComparison } from '@/components/reading/PronunciationComparison';
import type { PronunciationAttempt } from '@/lib/types';
import { ThemedAudioPlayer } from '@/components/ui/ThemedAudioPlayer';

export default function ReadingSessionPage() {
  const { id } = useParams<{ id: string }>();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<SessionFeedback[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const microphoneButtonRef = useRef<HTMLButtonElement | null>(null);
  const recordingStartedAtRef = useRef(0);
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationCheck | null>(null);
  const [pronunciationError, setPronunciationError] = useState<string | null>(null);
  const [pronunciationAttempts, setPronunciationAttempts] = useState<PronunciationAttempt[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [narrations, setNarrations] = useState<BookNarration[]>([]);
  const [selectedVoiceProfileId, setSelectedVoiceProfileId] = useState('');
  const [loadingNarration, setLoadingNarration] = useState(false);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [narrationError, setNarrationError] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const narrationAudio = useRef<HTMLAudioElement>(null);

  const sentences = (book?.text_content || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const paragraphs = Array.from(
    { length: Math.ceil(sentences.length / 6) },
    (_, index) => sentences.slice(index * 6, index * 6 + 6).join(' '),
  );
  const storyImages = [book?.cover_image_url, ...(book?.image_urls || [])].filter(Boolean) as string[];

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => setImageIndex(0), [id]);

  useEffect(() => {
    setImageIndex((current) => Math.min(current, Math.max(0, storyImages.length - 1)));
  }, [storyImages.length]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const selectedNarration = narrations.find(
    (narration) => String(narration.voice_profile_id) === selectedVoiceProfileId,
  ) || null;

  useEffect(() => {
    if (selectedNarration?.status !== 'processing') return;
    const poll = async () => {
      try {
        const response = await bookNarrationsApi.status(selectedNarration.id);
        setNarrations((previous) => previous.map((narration) => (
          narration.id === selectedNarration.id ? response.data : narration
        )));
      } catch (err) {
        setNarrationError((err as ApiErrorShape).message);
      }
    };
    void poll();
    const interval = window.setInterval(() => { void poll(); }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedNarration?.id, selectedNarration?.status]);

  useEffect(() => () => {
    narrationAudio.current?.pause();
    if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
  }, [narrationAudioUrl]);

  async function load() {
    try {
      const sessionRes = await sessionsApi.get(id);
      const loadedSession = sessionRes.data.reading_session as ReadingSession;
      setSession(loadedSession);
      const bookRes = await booksApi.get(loadedSession.book_id);
      setBook(bookRes.data.book);
      const [feedbackResult, attemptsResult, profileResult, narrationResult] = await Promise.allSettled([
        sessionsApi.listFeedback(id),
        sessionsApi.listPronunciationAttempts(id),
        voiceProfilesApi.list(),
        bookNarrationsApi.list(loadedSession.book_id),
      ]);
      setFeedback(feedbackResult.status === 'fulfilled' ? feedbackResult.value.data.feedback : []);
      setPronunciationAttempts(attemptsResult.status === 'fulfilled' ? attemptsResult.value.data.pronunciation_attempts : []);
      const readyProfiles = profileResult.status === 'fulfilled'
        ? profileResult.value.data.voice_profiles.filter((profile: VoiceProfile) => profile.status === 'ready')
        : [];
      setVoiceProfiles(readyProfiles);
      setNarrations(narrationResult.status === 'fulfilled' ? narrationResult.value.data.book_narrations : []);
      setSelectedVoiceProfileId(
        String(loadedSession.voice_profile_id || readyProfiles[0]?.id || ''),
      );
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }

  async function listenToBook() {
    if (!book || !selectedVoiceProfileId) {
      setNarrationError('Choose a voice profile first.');
      return;
    }
    setNarrationError(null);
    setLoadingNarration(true);
    narrationAudio.current?.pause();
    if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
    setNarrationAudioUrl(null);
    try {
      // The API returns the existing ready row for this exact book/profile
      // pair, so this call only generates audio when that cache entry is new.
      const response = await bookNarrationsApi.create(book.id, {
        voice_profile_id: Number(selectedVoiceProfileId),
      });
      const narration = response.data.book_narration as BookNarration;
      setNarrations((previous) => [
        narration,
        ...previous.filter((item) => item.id !== narration.id),
      ]);
      if (narration.status === 'ready') {
        const audioResponse = await bookNarrationsApi.audio(narration.id);
        setNarrationAudioUrl(URL.createObjectURL(audioResponse.data));
      }
    } catch (err) {
      setNarrationError((err as ApiErrorShape).message);
    } finally {
      setLoadingNarration(false);
    }
  }

  async function onMarkComplete() {
    setCompleting(true);
    try {
      const res = await sessionsApi.update(id, { mark_complete: true });
      setSession(res.data.reading_session);
      setConfirmComplete(false);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    } finally {
      setCompleting(false);
    }
  }

  async function startListening() {
    setPronunciationError(null);
    setPronunciationResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microphone recording is not supported in this browser. Please use Chrome, Edge, or Safari over HTTPS or localhost.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const preferredType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!audio.size) return;
        if (Date.now() - recordingStartedAtRef.current < 750) {
          setPronunciationError('That recording was a little too short. Take a breath, then read the paragraph again.');
          return;
        }
        setTranscribing(true);
        try {
          const form = new FormData();
          const extension = (recorder.mimeType || '').includes('mp4') ? 'mp4' : (recorder.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
          const recordingFile = new File([audio], `my-reading.${extension}`, { type: audio.type });
          if (!isAllowedUploadFile(recordingFile, 'audio')) {
            setPronunciationError(uploadFormatError('audio'));
            return;
          }
          form.append('audio', recordingFile);
          const response = await sessionsApi.transcribePronunciation(id, form);
          const spoken = response.data.transcript as string;
          setTranscript(spoken || '');
          if (!spoken) setPronunciationError('I could not hear any words. Try again a little closer to the microphone.');
        } catch (err) {
          setPronunciationError((err as ApiErrorShape).message || 'We could not analyse that recording. Please try again.');
        } finally {
          setTranscribing(false);
        }
      };
      setTranscript('');
      setListening(true);
      recordingStartedAtRef.current = Date.now();
      recorder.start();
    } catch (err) {
      setListening(false);
      const permissionDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setPronunciationError(permissionDenied ? 'Microphone permission is turned off. Allow microphone access for TeachAlike, then try again.' : err instanceof Error && err.message ? err.message : 'We could not open the microphone. Check it is connected and try again.');
    }
  }

  function stopListening() { recorderRef.current?.state === 'recording' && recorderRef.current.stop(); }

  async function checkPronunciation() {
    if (!transcript.trim()) {
      setPronunciationError('Read the paragraph aloud first, then check your pronunciation.');
      return;
    }
    setChecking(true);
    setPronunciationError(null);
    setPronunciationResult(null);
    try {
      const res = await sessionsApi.checkPronunciation(id, { paragraph_index: paragraphIndex, transcript });
      setPronunciationResult(res.data);
      load();
    } catch (err) {
      setPronunciationError((err as ApiErrorShape).message);
    } finally {
      setChecking(false);
    }
  }

  function retryParagraph() {
    setTranscript('');
    setPronunciationResult(null);
    setPronunciationError(null);
    window.requestAnimationFrame(() => {
      microphoneButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      microphoneButtonRef.current?.focus();
    });
  }

  function replayNarration() {
    if (narrationAudio.current && narrationAudioUrl) {
      void narrationAudio.current.play();
      return;
    }
    void listenToBook();
  }

  if (error) return <Alert>{error}</Alert>;
  if (!session) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Reading session #{session.id}</h1>
          {book && <><p className="mt-1 font-semibold text-brand-700">{book.title}</p><BookAttribution label={book.created_by_label} className="mt-1" /></>}
          <p className="mt-1 text-sm text-muted">
            Started {new Date(session.started_at).toLocaleString()}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Badge tone={session.is_complete ? 'success' : 'warning'}>
            {session.is_complete ? 'Complete' : 'In progress'}
          </Badge>
          {!session.is_complete && (
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => setConfirmComplete(true)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark complete
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {storyImages.length > 0 && (
          <Card className="lg:col-span-2 overflow-hidden border-brand-400/20 bg-brand-400/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="text-sm font-semibold text-brand-900">Story pictures</h2><p className="text-xs text-muted">Explore the illustrations while you read.</p></div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-brand-700">Picture {imageIndex + 1} of {storyImages.length}</span>
            </div>
            <div className="relative mx-auto mt-3 max-w-3xl overflow-hidden rounded-3xl bg-white/70 p-2 shadow-card">
              {/* External admin-provided image URLs cannot be allowlisted at build time for next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={storyImages[imageIndex]} src={storyImages[imageIndex]} alt={`Story illustration ${imageIndex + 1}`} className="story-gallery-image h-56 w-full rounded-2xl object-cover sm:h-72" />
              <Sparkles className="reading-sparkle absolute left-5 top-4 h-6 w-6 text-amber-400" aria-hidden="true" />
              {storyImages.length > 1 && <>
                <button type="button" aria-label="Previous story picture" onClick={() => setImageIndex((index) => (index - 1 + storyImages.length) % storyImages.length)} className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-900 shadow transition hover:scale-105 sm:left-5"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
                <button type="button" aria-label="Next story picture" onClick={() => setImageIndex((index) => (index + 1) % storyImages.length)} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-900 shadow transition hover:scale-105 sm:right-5"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
              </>}
            </div>
            {storyImages.length > 1 && <div className="mt-2 flex justify-center gap-1.5">{storyImages.map((image, index) => <button type="button" key={image} aria-label={`Show story picture ${index + 1}`} onClick={() => setImageIndex(index)} className={`h-2 rounded-full transition-all ${index === imageIndex ? 'w-6 bg-brand-600' : 'w-2 bg-brand-400/40'}`} />)}</div>}
          </Card>
        )}
        <Card className="lg:col-span-2 border-violet-300 bg-violet-50/60">
          <h2 className="mb-1 text-sm font-semibold text-brand-900">Listen in a familiar voice</h2>
          <p className="mb-4 text-sm text-muted">
            Choose a voice profile to hear this book. The same book and voice profile reuse the saved audio; another voice creates its own cached version.
          </p>
          {voiceProfiles.length === 0 ? (
            <p className="text-sm text-muted">No ready voice profiles are available yet.</p>
          ) : (
            <div className="space-y-3">
              <Select
                label="Voice profile"
                value={selectedVoiceProfileId}
                onChange={(event) => {
                  setSelectedVoiceProfileId(event.target.value);
                  setNarrationError(null);
                  if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
                  setNarrationAudioUrl(null);
                }}
              >
                <option value="">Choose a voice</option>
                {voiceProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label || `Voice profile #${profile.id}`}
                  </option>
                ))}
              </Select>
              {selectedNarration?.status === 'processing' ? (
                <p className="text-sm text-brand-700">Generating this voice’s book audio… It will be saved for the next listen.</p>
              ) : (
                <Button type="button" onClick={listenToBook} loading={loadingNarration} disabled={!selectedVoiceProfileId}>
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  {selectedNarration?.status === 'ready' ? 'Listen again' : 'Generate & listen'}
                </Button>
              )}
              {selectedNarration?.status === 'failed' && (
                <Alert>{selectedNarration.error_message || 'Narration generation failed. Try again.'}</Alert>
              )}
              {narrationAudioUrl && (
                <ThemedAudioPlayer
                  ref={narrationAudio}
                  key={narrationAudioUrl}
                  label="Familiar voice narration"
                  autoPlay
                  preload="metadata"
                  src={narrationAudioUrl}
                />
              )}
              {narrationError && <Alert>{narrationError}</Alert>}
            </div>
          )}
        </Card>
        <Card className="overflow-hidden">
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-brand-400/10 p-5">
            <h2 className="relative text-lg font-semibold text-brand-900">Read aloud for points</h2>
            <p className="relative mt-1 text-sm text-muted">Read the paragraph aloud into the microphone, then check your pronunciation and earn points.</p>
          </div>
          {paragraphs.length === 0 ? (
            <EmptyState title="This book has no text to read aloud yet" />
          ) : (
            <div className="space-y-4">
              <Select
                label="Paragraph"
                value={String(paragraphIndex)}
                onChange={(e) => {
                  setParagraphIndex(Number(e.target.value));
                  setTranscript('');
                  setPronunciationResult(null);
                }}
                disabled={session.is_complete}
              >
                {paragraphs.map((_, index) => (
                  <option key={index} value={index}>Paragraph {index + 1}</option>
                ))}
              </Select>
              <p className="rounded-xl border border-brand-400/30 bg-brand-400/10 p-4 text-base leading-relaxed text-brand-900">
                {paragraphs[paragraphIndex]}
              </p>
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <button ref={microphoneButtonRef} type="button" aria-label={listening ? 'Stop recording' : 'Start recording'} onClick={listening ? stopListening : startListening} disabled={session.is_complete || transcribing} className={`mic-orb ${listening ? 'is-listening' : ''} disabled:opacity-50`}>
                  {listening ? (
                    <Square className="h-8 w-8 fill-current" aria-hidden="true" />
                  ) : (
                    <Mic2 className="h-9 w-9" aria-hidden="true" />
                  )}
                </button>
                <p className="text-sm font-medium text-brand-900">{listening ? 'Listening… tap to finish' : transcribing ? 'Listening back to your words…' : 'Tap the microphone to read'}</p>
                <p className="text-xs text-muted">Each paragraph contains 6 sentences. Earn up to 50 leaderboard points based on your accuracy.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={checkPronunciation}
                  loading={checking}
                  disabled={session.is_complete || transcribing || !transcript.trim()}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Check pronunciation
                </Button>
              </div>
              {transcript && (
                <p className="rounded-lg bg-surface px-3 py-2 text-sm text-brand-900">
                  <span className="font-medium">I heard:</span> {transcript}
                </p>
              )}
              {pronunciationError && (
                <div className="space-y-2">
                  <Alert>{pronunciationError}</Alert>
                  <Button type="button" variant="secondary" onClick={transcript.trim() ? checkPronunciation : startListening} disabled={session.is_complete || listening || transcribing || checking}>
                    {transcript.trim() ? 'Try comparison again' : 'Try recording again'}
                  </Button>
                </div>
              )}
              {checking && <div className="neumorphic-inset flex items-center justify-center gap-3 p-4 text-sm font-bold text-brand-700" role="status"><Spinner size={20} />Listening carefully to your words…</div>}
            </div>
          )}
        </Card>

        {pronunciationResult && (
          <Card className="lg:col-span-2 overflow-hidden">
            <PronunciationComparison
              result={pronunciationResult}
              onRetry={retryParagraph}
              onReplayParagraph={selectedVoiceProfileId ? replayNarration : undefined}
            />
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-brand-900">Progress log</h2>
          <p className="mb-4 text-sm text-muted">Your reading scores are saved here automatically after each check.</p>
          {(!session.progress_log || session.progress_log.length === 0) && (
            <EmptyState title="No reading scores yet" description="Read a sentence aloud to create your first progress entry." />
          )}
          {session.progress_log && session.progress_log.length > 0 && (
            <ol className="mb-5 space-y-2 border-l-2 border-border pl-4">
              {session.progress_log.map((entry, i) => (
                <li key={i} className="text-sm text-brand-900">
                  {entry.type === 'pronunciation_check' && (
                    <>
                      <span className="font-medium">Paragraph {Number(entry.paragraph_index ?? entry.sentence_index) + 1}</span>
                      <span className="ml-2 text-muted">{entry.accuracy}% accuracy</span>
                      {Number(entry.awarded_points) > 0 && <span className="ml-2 font-medium text-success">+{String(entry.awarded_points)} points</span>}
                    </>
                  )}
                  {entry.type !== 'pronunciation_check' && (
                    <>
                  {entry.page !== undefined && <span className="font-medium">Page {entry.page}</span>}
                  {entry.accuracy !== undefined && (
                    <span className="ml-2 text-muted">{entry.accuracy}% accuracy</span>
                  )}
                  {entry.page === undefined && entry.accuracy === undefined && (
                    <span className="text-muted">{JSON.stringify(entry)}</span>
                  )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {pronunciationAttempts.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-extrabold text-brand-900">Pronunciation attempt history</h3>
              <p className="mt-1 text-xs text-muted">Newest attempt first. Earlier attempts stay available when you retry.</p>
              <ol className="mt-3 space-y-2">
                {pronunciationAttempts.slice(0, 10).map((attempt) => (
                  <li key={attempt.id} className="rounded-xl bg-brand-400/5 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold">Paragraph {attempt.paragraph_index + 1}</span>
                      <time className="text-xs text-muted" dateTime={attempt.created_at}>{new Date(attempt.created_at).toLocaleString()}</time>
                    </div>
                    <p className="mt-1 text-muted">Word match {attempt.text_match_accuracy}% · {attempt.provider_accuracy === null ? 'Provider score unavailable' : `Provider score ${attempt.provider_accuracy}%`} · {attempt.substitution_count + attempt.deletion_count} to practise</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-brand-900">Your reading feedback</h2>
          <p className="mb-4 text-sm text-muted">Feedback appears automatically after each pronunciation score.</p>

          {feedback && feedback.length === 0 && (
            <p className="text-sm text-muted">No feedback generated yet.</p>
          )}
          {feedback && feedback.length > 0 && (
            <ul className="space-y-3">
              {feedback.map((f) => (
                <li key={f.id} className="rounded-xl border border-border p-3">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="brand" className="capitalize">
                      {f.feedback_type}
                    </Badge>
                    <span className="text-xs text-muted">
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-brand-900">{f.feedback_text}</p>
                  {f.audio_url && (
                    <div className="mt-3">
                      <ThemedAudioPlayer compact label={`${f.feedback_type} audio feedback`} src={f.audio_url} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        onConfirm={onMarkComplete}
        loading={completing}
        danger={false}
        title="Mark this session complete?"
        description="This stamps the session as finished. You can still generate feedback afterward."
        confirmLabel="Mark complete"
      />
    </div>
  );
}
