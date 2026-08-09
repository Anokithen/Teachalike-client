'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import type { Ref } from 'react';
import { Check, CircleAlert, Flag, Sparkles } from 'lucide-react';
import type { PronunciationCheck, PronunciationComparisonToken } from '@/lib/types';

type ReadingWordStatus = 'unread' | 'active' | 'correct' | 'incorrect' | 'skipped';

interface ReadingWord {
  id: string;
  text: string;
  index: number;
  status: ReadingWordStatus;
  heard?: string | null;
}

interface ReadingWordTrackerProps {
  paragraph: string;
  paragraphIndex: number;
  result: PronunciationCheck | null;
  isReading: boolean;
}

const statusLabels: Record<ReadingWordStatus, string> = {
  unread: 'Not read yet',
  active: 'Read this word now',
  correct: 'Read correctly',
  incorrect: 'Needs another try',
  skipped: 'Skipped',
};

function fallbackWords(paragraph: string, paragraphIndex: number): ReadingWord[] {
  const matches = Array.from(paragraph.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu));
  return matches.map((match, index) => ({
    id: `${paragraphIndex}-${index}`,
    text: `${match[0]}${paragraph.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index).trim()}`,
    index,
    status: 'unread',
  }));
}

function resultWords(result: PronunciationCheck, paragraphIndex: number): ReadingWord[] {
  return result.comparison.tokens
    .filter((token): token is PronunciationComparisonToken & { global_word_index: number; expected: string } => (
      token.global_word_index !== null
      && token.global_word_index !== undefined
      && token.expected !== null
    ))
    .sort((left, right) => left.global_word_index - right.global_word_index)
    .map((token, index, tokens) => ({
      id: `${paragraphIndex}-${token.global_word_index}`,
      text: `${token.expected}${result.comparison.original_text.slice(
        token.character_end ?? 0,
        tokens[index + 1]?.character_start ?? result.comparison.original_text.length,
      ).trim()}`,
      index: token.global_word_index,
      status: token.status === 'correct'
        ? 'correct'
        : token.status === 'deletion' ? 'skipped' : 'incorrect',
      heard: token.heard,
    }));
}

const ReadingWordChip = memo(function ReadingWordChip({ word, activeRef, isCurrent }: {
  word: ReadingWord;
  activeRef?: Ref<HTMLSpanElement>;
  isCurrent: boolean;
}) {
  return (
    <span
      ref={activeRef}
      className={`reading-word reading-word--${word.status}${isCurrent ? ' reading-word--current' : ''}`}
      data-word-index={word.index}
      aria-current={isCurrent ? 'true' : undefined}
      title={word.heard && word.status === 'incorrect' ? `Heard: ${word.heard}` : statusLabels[word.status]}
    >
      <span className="reading-word__fill" aria-hidden="true" />
      <span className="reading-word__text">{word.text}</span>
      {word.status === 'correct' && <Check className="reading-word__icon" aria-hidden="true" />}
      {word.status === 'incorrect' && <CircleAlert className="reading-word__icon" aria-hidden="true" />}
      {word.status === 'skipped' && <Flag className="reading-word__icon" aria-hidden="true" />}
      <span className="sr-only">, {statusLabels[word.status]}</span>
    </span>
  );
});

export function ReadingWordTracker({ paragraph, paragraphIndex, result, isReading }: ReadingWordTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const words = useMemo(() => {
    const nextWords = result ? resultWords(result, paragraphIndex) : fallbackWords(paragraph, paragraphIndex);
    if (isReading && nextWords.length > 0 && !result) nextWords[0] = { ...nextWords[0], status: 'active' };
    return nextWords;
  }, [isReading, paragraph, paragraphIndex, result]);
  const completedCount = words.filter((word) => word.status === 'correct').length;
  const progress = words.length ? Math.round((completedCount / words.length) * 100) : 0;
  const currentWordIndex = words.findIndex((word) => word.status === 'active' || word.status === 'incorrect' || word.status === 'skipped');

  useEffect(() => {
    const container = containerRef.current;
    const activeWord = activeWordRef.current;
    if (!container || !activeWord) return;
    const containerBox = container.getBoundingClientRect();
    const wordBox = activeWord.getBoundingClientRect();
    const outsideComfortZone = wordBox.top < containerBox.top + 24 || wordBox.bottom > containerBox.bottom - 24;
    if (outsideComfortZone) {
      activeWord.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [words]);

  return (
    <section className="reading-tracker" aria-label="Word-by-word reading progress">
      <div className="reading-tracker__summary">
        <div>
          <p className="reading-tracker__count">{completedCount} / {words.length} words</p>
          <p className="text-xs text-muted">Progress counts words the pronunciation check matched.</p>
        </div>
        <span className="reading-tracker__percent" aria-hidden="true">{progress}%</span>
      </div>
      <div
        className="reading-tracker__bar"
        role="progressbar"
        aria-label="Correctly read words"
        aria-valuemin={0}
        aria-valuemax={words.length}
        aria-valuenow={completedCount}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div ref={containerRef} className="reading-tracker__passage" tabIndex={0}>
        {words.map((word) => (
          <ReadingWordChip
            key={word.id}
            word={word}
            isCurrent={word.index === currentWordIndex}
            activeRef={word.index === currentWordIndex ? activeWordRef : undefined}
          />
        ))}
      </div>
      <div className="reading-tracker__legend" aria-hidden="true">
        <span><Check className="h-3.5 w-3.5" />Read</span>
        <span><Sparkles className="h-3.5 w-3.5" />Read now</span>
        <span><CircleAlert className="h-3.5 w-3.5" />Try again</span>
        <span><Flag className="h-3.5 w-3.5" />Skipped</span>
      </div>
    </section>
  );
}
