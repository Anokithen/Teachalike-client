'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type AudioHTMLAttributes,
  type CSSProperties,
} from 'react';
import { Gauge, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

interface ThemedAudioPlayerProps extends Omit<AudioHTMLAttributes<HTMLAudioElement>, 'controls'> {
  label?: string;
  compact?: boolean;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export const ThemedAudioPlayer = forwardRef<HTMLAudioElement, ThemedAudioPlayerProps>(
  function ThemedAudioPlayer(
    {
      label = 'Audio playback',
      compact = false,
      autoPlay,
      onEnded,
      onDurationChange,
      onError,
      onLoadedMetadata,
      onPause,
      onPlay,
      onTimeUpdate,
      src,
      ...audioProps
    },
    forwardedRef,
  ) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);

    useImperativeHandle(forwardedRef, () => audioRef.current as HTMLAudioElement);

    async function togglePlayback() {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        try {
          await audio.play();
        } catch {
          // The native error callback provides the user-facing playback error.
        }
      } else {
        audio.pause();
      }
    }

    function seek(nextTime: number) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    }

    function replay() {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      setCurrentTime(0);
      void audio.play().catch(() => undefined);
    }

    function changeSpeed(nextSpeed: number) {
      if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
      setSpeed(nextSpeed);
    }

    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
      <section
        className={`overflow-hidden rounded-2xl border border-brand-400/30 bg-gradient-to-br from-cyan-50 via-white to-violet-50 shadow-sm dark:from-cyan-50 dark:via-bg dark:to-violet-50 ${compact ? 'p-3' : 'p-4'}`}
        aria-label={label}
      >
        <audio
          {...audioProps}
          ref={audioRef}
          src={src}
          autoPlay={autoPlay}
          preload={audioProps.preload || 'metadata'}
          controlsList="nodownload"
          className="hidden"
          onContextMenu={(event) => event.preventDefault()}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration || 0);
            event.currentTarget.playbackRate = speed;
            onLoadedMetadata?.(event);
          }}
          onDurationChange={(event) => {
            if (Number.isFinite(event.currentTarget.duration)) {
              setDuration(event.currentTarget.duration);
            }
            onDurationChange?.(event);
          }}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
            onTimeUpdate?.(event);
          }}
          onPlay={(event) => {
            setPlaying(true);
            onPlay?.(event);
          }}
          onPause={(event) => {
            setPlaying(false);
            onPause?.(event);
          }}
          onEnded={(event) => {
            setPlaying(false);
            setCurrentTime(0);
            onEnded?.(event);
          }}
          onError={onError}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-md transition hover:scale-105 hover:brightness-110 active:scale-95"
            aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          >
            {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Volume2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                <p className="truncate text-sm font-bold text-brand-900">{label}</p>
              </div>
              <button
                type="button"
                onClick={replay}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brand-600 transition hover:bg-brand-400/10"
                aria-label={`Replay ${label} from the beginning`}
                title="Replay from beginning"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              disabled={!duration}
              onChange={(event) => seek(Number(event.target.value))}
              className="themed-audio-range block w-full"
              style={{ '--audio-progress': `${progress}%` } as CSSProperties}
              aria-label={`Seek through ${label}`}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            <div className="mt-1 flex justify-between text-[11px] font-semibold tabular-nums text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className={`${compact ? 'mt-2.5' : 'mt-3.5'} flex flex-wrap items-center gap-1.5 border-t border-brand-400/15 pt-2.5`}>
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-brand-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Speed
          </span>
          {PLAYBACK_SPEEDS.map((playbackSpeed) => (
            <button
              key={playbackSpeed}
              type="button"
              onClick={() => changeSpeed(playbackSpeed)}
              className={`min-h-9 rounded-full px-2.5 text-xs font-bold transition ${speed === playbackSpeed ? 'bg-brand-600 text-white shadow-sm' : 'bg-white/75 text-brand-700 hover:bg-brand-400/15 dark:bg-bg/70'}`}
              aria-pressed={speed === playbackSpeed}
              aria-label={`Play at ${playbackSpeed} times speed`}
            >
              {playbackSpeed}×
            </button>
          ))}
        </div>
      </section>
    );
  },
);
