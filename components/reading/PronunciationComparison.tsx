'use client';

import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Check,
  CircleAlert,
  Ear,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ComparisonTokenStatus,
  PronunciationCheck,
  PronunciationComparisonToken,
} from '@/lib/types';

interface PronunciationComparisonProps {
  result: PronunciationCheck;
  onRetry: () => void;
  onReplayParagraph?: () => void;
}

const statusLabels: Record<ComparisonTokenStatus, string> = {
  correct: 'Correct',
  substitution: 'Heard differently',
  deletion: 'Skipped',
  insertion: 'Extra word',
};

const chipClasses: Record<ComparisonTokenStatus, string> = {
  correct: 'comparison-chip comparison-correct',
  substitution: 'comparison-chip comparison-substitution',
  deletion: 'comparison-chip comparison-deletion',
  insertion: 'comparison-chip comparison-insertion',
};

function StatusIcon({ status }: { status: ComparisonTokenStatus }) {
  if (status === 'correct') return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
  if (status === 'substitution') return <Ear className="h-3.5 w-3.5" aria-hidden="true" />;
  if (status === 'deletion') return <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Plus className="h-3.5 w-3.5" aria-hidden="true" />;
}

function locationLabel(token: PronunciationComparisonToken) {
  if (token.status === 'insertion') {
    const sentence = token.sentence_index === null || token.sentence_index === undefined ? '' : `Sentence ${token.sentence_index + 1} · `;
    if (token.after_word_index !== null && token.after_word_index !== undefined) {
      return `${sentence}After paragraph word ${token.after_word_index + 1}`;
    }
    if (token.before_word_index !== null && token.before_word_index !== undefined) {
      return `${sentence}Before paragraph word ${token.before_word_index + 1}`;
    }
    return `Paragraph ${token.paragraph_index + 1}`;
  }
  return `Sentence ${(token.sentence_index ?? 0) + 1} · Word ${(token.word_index ?? 0) + 1}`;
}

function mistakeTip(token: PronunciationComparisonToken) {
  if (token.status === 'substitution') return `I heard “${token.heard}” instead of “${token.expected}”. Let’s practise this word again.`;
  if (token.status === 'deletion') return 'This word may have been skipped. Try saying it slowly with the words around it.';
  if (token.status === 'insertion') return `I heard the extra word “${token.heard}”. Read the nearby words once more.`;
  return 'Great job! This word matched.';
}

export function PronunciationComparison({ result, onRetry, onReplayParagraph }: PronunciationComparisonProps) {
  const [selectedToken, setSelectedToken] = useState<PronunciationComparisonToken | null>(null);
  const [supportsSpeech, setSupportsSpeech] = useState(false);
  const { comparison } = result;
  const strongResult = comparison.summary.words_needing_practice === 0 || result.text_match_accuracy >= 90;

  useEffect(() => setSupportsSpeech('speechSynthesis' in window), []);

  function speakWord(word: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
  }

  function wordChip(token: PronunciationComparisonToken, label: string) {
    const content = (
      <>
        <span className="flex items-center gap-1"><StatusIcon status={token.status} />{label}</span>
        {token.status === 'substitution' && <span className="block text-[11px] font-semibold">Heard: {token.heard}</span>}
        {token.status === 'deletion' && <span className="block text-[11px] font-semibold">Try this word</span>}
        <span className="sr-only">{statusLabels[token.status]}. {locationLabel(token)}.</span>
      </>
    );
    return token.status === 'correct' ? (
      <span className={chipClasses[token.status]}>{content}</span>
    ) : (
      <button
        type="button"
        className={`${chipClasses[token.status]} min-h-11 text-left focus-visible:ring-2 focus-visible:ring-brand-600`}
        onClick={() => setSelectedToken(token)}
        aria-label={`${label}: ${statusLabels[token.status]}. ${locationLabel(token)}. Open details.`}
      >
        {content}
      </button>
    );
  }

  function originalTokens() {
    let cursor = 0;
    const jsOffset = (codePointOffset: number) => Array.from(comparison.original_text).slice(0, codePointOffset).join('').length;
    const rendered: ReactNode[] = comparison.tokens.map((token, index) => {
      if (token.status === 'insertion') {
        return <Fragment key={`insert-${index}`}>{wordChip(token, token.heard || 'Extra word')}</Fragment>;
      }
      const start = token.character_start === null || token.character_start === undefined ? cursor : jsOffset(token.character_start);
      const end = token.character_end === null || token.character_end === undefined ? start : jsOffset(token.character_end);
      const separator = comparison.original_text.slice(cursor, start);
      cursor = end;
      return (
        <Fragment key={`expected-${token.global_word_index}`}>
          {separator}{wordChip(token, token.expected || '')}
        </Fragment>
      );
    });
    rendered.push(<Fragment key="original-suffix">{comparison.original_text.slice(cursor)}</Fragment>);
    return rendered;
  }

  const heardTokens = comparison.tokens.filter((token) => token.heard !== null);

  return (
    <section className="mt-6 space-y-5" aria-label="Pronunciation comparison">
      <div className="comparison-result-header" aria-live="polite" aria-atomic="true">
        {strongResult && <Sparkles className="comparison-celebration h-8 w-8 text-amber-500" aria-hidden="true" />}
        <div className="comparison-score" style={{ '--score': `${result.text_match_accuracy * 3.6}deg` } as CSSProperties}>
          <span className="text-2xl font-extrabold">{result.text_match_accuracy}%</span>
          <span className="text-[11px] font-bold">word match</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold text-brand-900">{result.message}</h3>
          <p className="mt-1 text-sm text-brand-700">
            {result.points_awarded > 0 ? `You earned ${result.points_awarded} points!` : result.already_awarded ? 'Your points for this paragraph are already safe.' : 'Keep practising—you can try again.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/80 px-3 py-1.5">{comparison.summary.words_needing_practice} words to practise</span>
            <span className="rounded-full bg-white/80 px-3 py-1.5">{result.provider_accuracy === null ? 'Provider score unavailable' : `Provider reading score: ${result.provider_accuracy}%`}</span>
            {result.improvement && result.improvement > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">You improved by {result.improvement}%!</span>}
          </div>
        </div>
      </div>

      <p className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <strong>A friendly note:</strong> This compares the words the microphone detected; it is not a phonetic diagnosis. Sometimes background noise or an accent can change what we hear. You can try the word again.
      </p>

      <div aria-label="Comparison legend" className="flex flex-wrap gap-2">
        {(['correct', 'substitution', 'deletion', 'insertion'] as ComparisonTokenStatus[]).map((status) => (
          <span key={status} className={`${chipClasses[status]} py-2`}><StatusIcon status={status} />{statusLabels[status]}</span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="neumorphic-inset p-4">
          <h4 className="mb-3 font-extrabold text-brand-900">Original paragraph</h4>
          <div className="flex flex-wrap items-center gap-y-2 text-base leading-loose">{originalTokens()}</div>
        </div>
        <div className="neumorphic-inset p-4">
          <h4 className="mb-3 font-extrabold text-brand-900">What I heard</h4>
          <p className="mb-3 text-sm leading-relaxed text-brand-900">{comparison.spoken_text}</p>
          <div className="flex flex-wrap gap-2">
            {heardTokens.map((token, index) => (
              <span key={`heard-${index}`} className={chipClasses[token.status]}>
                <StatusIcon status={token.status} />{token.heard}
                <span className="sr-only">{statusLabels[token.status]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {selectedToken && (
        <div className="rounded-2xl border-2 border-brand-400 bg-white p-4 shadow-card" role="region" aria-label="Selected word details">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">{statusLabels[selectedToken.status]} · {locationLabel(selectedToken)}</p>
              <p className="mt-2 text-lg font-extrabold text-brand-900">Expected: {selectedToken.expected || 'No expected word'}</p>
              {selectedToken.heard && <p className="text-sm text-muted">Heard: {selectedToken.heard}</p>}
              <p className="mt-2 text-sm text-brand-900">{mistakeTip(selectedToken)}</p>
            </div>
            <button type="button" onClick={() => setSelectedToken(null)} className="min-h-11 rounded-xl px-3 text-sm font-bold text-brand-700">Close details</button>
          </div>
          <Button type="button" className="mt-3" onClick={onRetry}><RotateCcw className="h-4 w-4" aria-hidden="true" />Try paragraph again</Button>
        </div>
      )}

      {comparison.practice_words.length > 0 && (
        <div>
          <h4 className="text-lg font-extrabold text-brand-900">Words to practise</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {comparison.practice_words.map((word) => (
              <article key={`${word.global_word_index}-${word.status}`} className="neumorphic-card p-4">
                <p className="text-2xl font-extrabold text-brand-900">{word.expected}</p>
                <p className="mt-1 text-sm text-muted">{word.heard ? `I heard “${word.heard}”.` : 'This word may have been skipped.'}</p>
                <p className="mt-2 text-xs font-bold text-brand-600">Sentence {word.sentence_number} · Word {word.word_number}</p>
                <p className="mt-2 text-sm">Say it slowly, then read it with the nearby words.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {supportsSpeech && <Button type="button" variant="secondary" onClick={() => speakWord(word.expected)} aria-label={`Hear the word ${word.expected}`}><Volume2 className="h-4 w-4" aria-hidden="true" />Hear word</Button>}
                  <Button type="button" onClick={onRetry}><RotateCcw className="h-4 w-4" aria-hidden="true" />Try again</Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {result.feedback && <p className="text-sm text-brand-800"><strong>Reading tip:</strong> {result.feedback}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onRetry}><RotateCcw className="h-4 w-4" aria-hidden="true" />Read this paragraph again</Button>
        {onReplayParagraph && <Button type="button" variant="secondary" onClick={onReplayParagraph}><Volume2 className="h-4 w-4" aria-hidden="true" />Replay book narration</Button>}
      </div>
    </section>
  );
}
