'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import {
  Circle,
  Mic2,
  Music2,
  Pencil,
  Play,
  Sparkles,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { voiceProfilesApi } from '@/lib/endpoints';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth-context';
import { ApiErrorShape, VoiceProfile, VoiceProfileStatus } from '@/lib/types';
import { isAllowedUploadFile, uploadFormatError } from '@/lib/file-validation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ThemedAudioPlayer } from '@/components/ui/ThemedAudioPlayer';

// Keep the browser-side guard aligned with MAX_VOICE_PROFILE_SIZE_MB.
const MAX_BYTES = 50 * 1024 * 1024;
const STATUS_TONE: Record<VoiceProfileStatus, 'warning' | 'success' | 'danger'> = {
  processing: 'warning', ready: 'success', failed: 'danger',
};

function RecordingWave() {
  return <div className="recording-wave" aria-hidden="true">
    {Array.from({ length: 13 }, (_, index) => <span key={index} />)}
  </div>;
}

function PlaybackWave() {
  return <div className="playback-wave" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
  </div>;
}

function writeWavString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function audioBufferToWav(audioBuffer: AudioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, channel) => audioBuffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function convertRecordingToWav(recording: Blob) {
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Audio conversion is not supported by this browser.');

  const audioContext = new AudioContextClass();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await recording.arrayBuffer());
    return audioBufferToWav(audioBuffer);
  } finally {
    await audioContext.close();
  }
}

export default function VoiceProfilesPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<VoiceProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | string[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VoiceProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<VoiceProfile | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const previewAudio = useRef<HTMLAudioElement>(null);
  const previewRequest = useRef(0);

  useEffect(() => { load(); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => {
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
    recordingStream.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  async function load() {
    try { setProfiles((await voiceProfilesApi.list()).data.voice_profiles); }
    catch (err) { setError((err as ApiErrorShape).message); }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    setCreateError(null);
    if (recordingUrl) setRecordingUrl(null);
    if (!selected) return setFile(null);
    if (!isAllowedUploadFile(selected, 'audio')) {
      setFile(null);
      event.target.value = '';
      return setCreateError(uploadFormatError('audio'));
    }
    if (selected.size > MAX_BYTES) {
      setFile(null);
      return setCreateError('The recording must be no larger than 50 MB.');
    }
    setFile(selected);
  }

  function discardPendingRecording() {
    setRecordingUrl(null);
    setFile(null);
    setCreateError(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function uploadRecording(recording: File) {
    setCreateError(null); setCreating(true);
    try {
      if (!isAllowedUploadFile(recording, 'audio')) {
        setCreateError(uploadFormatError('audio'));
        return;
      }
      const data = new FormData();
      data.append('audio', recording);
      if (label.trim()) data.append('label', label.trim());
      const res = await voiceProfilesApi.create(data);
      setProfiles((previous) => [res.data.voice_profile, ...(previous || [])]);
      setLabel(''); setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setCreateError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally { setCreating(false); }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!file) return setCreateError('Record your voice or choose an audio file.');
    await uploadRecording(file);
  }

  async function startRecording() {
    setCreateError(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setCreateError('Voice recording is not supported by this browser. Please choose an audio file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStream.current = stream;
      const supportedType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      recorder.current = mediaRecorder;
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const recordedBlob = new Blob(chunks.current, { type: mimeType });
        if (!recordedBlob.size) {
          setCreateError('No audio was captured. Please try recording again.');
          return;
        }
        try {
          const wavBlob = await convertRecordingToWav(recordedBlob);
          if (wavBlob.size > MAX_BYTES) {
            setCreateError('The WAV recording must be no larger than 50 MB.');
            return;
          }
          const recordedFile = new File([wavBlob], `voice-recording-${Date.now()}.wav`, { type: 'audio/wav' });
          if (recordingUrl) URL.revokeObjectURL(recordingUrl);
          setRecordingUrl(URL.createObjectURL(wavBlob));
          setFile(recordedFile);
          if (fileInput.current) fileInput.current.value = '';
          setCreateError(null);
        } catch {
          setCreateError('Could not convert the recording to WAV. Please try again or choose an audio file instead.');
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const name = (err as DOMException).name;
      setCreateError(name === 'NotAllowedError' ? 'Microphone access was denied. Allow microphone access and try again.' : 'Could not start the microphone. Please try again.');
    }
  }

  function stopRecording() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setIsRecording(false);
  }

  async function onSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await voiceProfilesApi.update(editing.id, { label: editLabel });
      setProfiles((previous) => previous?.map((profile) => profile.id === editing.id ? res.data.voice_profile : profile) || null);
      setEditing(null);
    } catch (err) { setError((err as ApiErrorShape).message); }
    finally { setSaving(false); }
  }

  async function onPreview(profile: VoiceProfile) {
    const requestId = ++previewRequest.current;
    previewAudio.current?.pause();
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewingId(profile.id);
    try {
      const res = await voiceProfilesApi.audio(profile.id);
      const url = URL.createObjectURL(res.data);
      // If another recording was selected while this request was in flight,
      // discard this response rather than replacing the active player.
      if (requestId !== previewRequest.current) {
        URL.revokeObjectURL(url);
        return;
      }
      setPreviewUrl(url);
    } catch (err) {
      if (requestId === previewRequest.current) setPreviewError((err as ApiErrorShape).message);
    } finally {
      if (requestId === previewRequest.current) setPreviewingId(null);
    }
  }

  async function onDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await voiceProfilesApi.remove(pendingDelete.id);
      setProfiles((previous) => (previous || []).filter((profile) => profile.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) { setError((err as ApiErrorShape).message); }
    finally { setDeleting(false); }
  }

  return <div>
    <PageHeader eyebrow="Familiar voices" title="Voice profiles" icon={Mic2} description="Create a warm, familiar audio experience for every reading adventure." />
    <p className="mt-1 text-sm text-muted">Create a private ElevenLabs voice clone for book reading. Recordings are available only to their owner and administrators.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold text-brand-900">Stored voice profiles</h2>
        {!profiles && !error && <Spinner />}
        {error && <Alert>{error}</Alert>}
        {profiles?.length === 0 && <EmptyState title="No recordings yet" description="Record your voice or upload an audio file to create a voice profile." />}
        {profiles && profiles.length > 0 && <ul className="divide-y divide-border">
          {profiles.map((profile) => <li key={profile.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-medium text-brand-900">{profile.label || `Voice profile #${profile.id}`}</p>
                <p className="text-xs text-muted">{profile.owner_name && `${profile.owner_name} · `}Created {new Date(profile.created_at).toLocaleDateString()} {profile.has_cloned_voice && '· ElevenLabs clone ready'}</p></div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><Badge tone={STATUS_TONE[profile.status] || 'warning'}>{profile.status}</Badge>
                <Button className="flex-1 sm:flex-none" variant="ghost" loading={previewingId === profile.id} onClick={() => onPreview(profile)}><Play className="h-4 w-4" aria-hidden="true" />Play</Button>
                <Button className="flex-1 sm:flex-none" variant="ghost" onClick={() => { setEditing(profile); setEditLabel(profile.label || ''); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
                {!isAdmin && <Button className="flex-1 sm:flex-none" variant="ghost" onClick={() => setPendingDelete(profile)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>}</div>
            </div>
          </li>)}
        </ul>}
        {previewError && <Alert>{previewError}</Alert>}
        {previewUrl && <div className="voice-playback-card mt-4 overflow-hidden rounded-2xl border border-brand-400/30 bg-gradient-to-r from-cyan-50 via-violet-50 to-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-violet-500 text-white shadow-md"><Music2 className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-brand-900">Your voice is ready to play</p><p className="text-xs text-muted">Use the controls below to pause, replay, or seek.</p></div></div>
          <PlaybackWave />
          <ThemedAudioPlayer ref={previewAudio} key={previewUrl} label="Voice profile preview" autoPlay preload="metadata" src={previewUrl} onEnded={() => setPreviewUrl(null)} onError={() => setPreviewError('This recording could not be played. Please try again.')} />
        </div>}
      </Card>
      {!isAdmin && <Card><h2 className="mb-4 text-sm font-semibold text-brand-900">Clone your voice</h2>
        <form onSubmit={onCreate} className="space-y-4">
          <Input label="Label (optional)" value={label} onChange={(event) => setLabel(event.target.value)} />
          <div className={`voice-recorder-panel overflow-hidden rounded-2xl border p-4 transition-colors ${isRecording ? 'is-recording border-danger/40 bg-gradient-to-br from-rose-50 via-amber-50 to-cyan-50' : 'border-brand-400/30 bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-900">Record with your microphone</p>
              <p className="mt-1 text-xs text-muted">When you stop, the recording is converted to WAV and held here for review. It uploads only after you confirm.</p>
              </div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-sm ${isRecording ? 'animate-pulse bg-danger text-white' : 'bg-gradient-to-br from-brand-600 to-violet-500 text-white'}`}><Mic2 className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <div className="voice-recorder-status mt-4 flex min-h-12 items-center justify-center rounded-xl bg-white/70 px-3">
              {isRecording ? <RecordingWave /> : <p className="text-xs font-medium text-brand-600">Ready to capture a story</p>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!isRecording ? <button type="button" onClick={startRecording} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-cyan-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Circle className="h-4 w-4 fill-current" aria-hidden="true" />Start recording</button> :
                <Button type="button" variant="danger" onClick={stopRecording}><Square className="h-4 w-4 fill-current" aria-hidden="true" />Stop &amp; review</Button>}
              {isRecording && <span className="text-sm font-semibold text-danger" aria-live="polite">Recording now…</span>}
              {creating && <span className="text-sm text-muted" aria-live="polite">Uploading and cloning your voice…</span>}
            </div>
            {recordingUrl && <div className="voice-recording-preview mt-3 rounded-xl bg-white/70 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-700"><Sparkles className="h-4 w-4" aria-hidden="true" />Review before uploading</div><PlaybackWave /><ThemedAudioPlayer key={recordingUrl} compact label="Recording review" preload="metadata" src={recordingUrl} onEnded={() => setRecordingUrl(null)} onError={() => setCreateError('This recording could not be played. Please record it again.')} /><Button type="button" variant="ghost" onClick={discardPendingRecording} className="mt-2 min-h-0 px-0 py-1 text-xs text-danger"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete this recording</Button></div>}
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-brand-900">Or upload an existing recording</span>
            <input ref={fileInput} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave,audio/webm,audio/ogg,audio/mp4,audio/x-m4a,video/mp4,.mp3,.wav,.webm,.ogg,.m4a,.mp4" onChange={onFileChange} className="sr-only" />
            <span className="voice-file-picker mt-2 flex cursor-pointer flex-col justify-between gap-3 rounded-xl border-2 border-dashed border-violet-300 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 px-3 py-3 transition hover:border-brand-400 hover:shadow-sm sm:flex-row sm:items-center sm:px-4">
              <span className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><Upload className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-violet-700">Choose audio file</span><span className="block text-xs text-muted">MP3, WAV, WebM, OGG, M4A, or MP4 · up to 50 MB</span></span></span>
              <span className="max-w-full truncate text-xs font-medium text-brand-600 sm:max-w-28">{file?.name || 'No file chosen'}</span>
            </span>
          </label>
          <p className="-mt-2 text-xs text-muted">MP3, WAV, WebM, OGG, or M4A/MP4, up to 50 MB. Upload only a voice you have permission to use.</p>
          <Alert>{createError}</Alert><Button type="submit" loading={creating} disabled={!file || isRecording} className="w-full">Accept &amp; create voice clone</Button>
        </form>
      </Card>
      }
    </div>
    <ConfirmDialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} onConfirm={onDelete} loading={deleting} title="Delete this voice profile?" description="This permanently deletes the profile and its Cloudinary recording." confirmLabel="Delete" />
    <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit voice profile" footer={<><Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button><Button onClick={onSave} loading={saving}>Save label</Button></>}>
      <Input label="Label" value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
    </Modal>
  </div>;
}
