'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Flame,
  Gamepad2,
  Lightbulb,
  PartyPopper,
  Pencil,
  Puzzle,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { childrenApi, miniGamesApi } from '@/lib/endpoints';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChildPinModal } from '@/components/children/ChildPinModal';
import { ApiErrorShape, Child, GameResult, MiniGame } from '@/lib/types';

type GameContent = { words?: string[]; questions?: { word?: string; question: string; options: string[]; answer: string; hint?: string; explanation?: string }[] };
type GamePrompt = { word?: string; question: string; options: string[]; answer: string; hint?: string; explanation?: string; scrambled?: string[] };
type SpellingDifficulty = 'easy' | 'medium' | 'hard';
type SpellingStage = 'choose' | 'memorise' | 'write' | 'feedback';

const MAX_WORD_BUILDER_WORDS = 10;
const SPELLING_WORD_COUNTS: Record<SpellingDifficulty, number> = { easy: 3, medium: 6, hard: 10 };

function shuffleLetters(word: string) {
  const letters = word.split('');
  if (letters.length < 2) return letters;

  // Keep the most mixed result, so tiles do not accidentally remain close to
  // their original positions after a random shuffle.
  let shuffled = [...letters];
  let mostMoved = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = [...letters];
    for (let index = candidate.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidate[index], candidate[swapIndex]] = [candidate[swapIndex], candidate[index]];
    }
    const moved = candidate.reduce((count, letter, index) => count + Number(letter !== letters[index]), 0);
    if (moved > mostMoved) {
      shuffled = candidate;
      mostMoved = moved;
    }
    if (mostMoved === letters.length) break;
  }
  return shuffled;
}

const GAME_DETAILS: Record<string, { icon: LucideIcon; title: string; goal: string; instructions: string }> = {
  word_puzzle: { icon: Puzzle, title: 'Word builder', goal: 'Build story words', instructions: 'Look at the mixed-up letters, then type the word in the correct order.' },
  spelling: { icon: Pencil, title: 'Spelling practice', goal: 'Practise key words', instructions: 'Read each book word carefully and type it with the correct spelling.' },
  quiz: { icon: Sparkles, title: 'Story word adventure', goal: 'Unlock story words', instructions: 'Use clues, hints, and story memory to choose the best answer.' },
};

export default function MiniGamePage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<MiniGame | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [childId, setChildId] = useState('');
  const [pendingChild, setPendingChild] = useState<Child | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedLetters, setSelectedLetters] = useState<Record<number, number[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | string[] | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [spellingDifficulty, setSpellingDifficulty] = useState<SpellingDifficulty | null>(null);
  const [spellingStage, setSpellingStage] = useState<SpellingStage>('choose');
  const [memoriseSecondsLeft, setMemoriseSecondsLeft] = useState(30);
  const [spellingResponse, setSpellingResponse] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizHintsUsed, setQuizHintsUsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const [gameRes, childrenRes] = await Promise.all([miniGamesApi.get(id), childrenApi.list()]);
        setGame(gameRes.data.mini_game);
        setChildren(childrenRes.data.children);
        setAnswers({});
        setSelectedLetters({});
        setQuizIndex(0);
        setQuizHintsUsed({});
        setResult(null);
        setSubmitError(null);
        setSpellingDifficulty(null);
        setSpellingStage('choose');
        setSpellingResponse('');
        setMemoriseSecondsLeft(30);
      } catch (err) {
        setError((err as ApiErrorShape).message);
      }
    }
    load();
  }, [id]);

  const isQuiz = game?.game_type === 'quiz';
  const isSpelling = game?.game_type === 'spelling';
  const details = GAME_DETAILS[game?.game_type || ''] || { icon: Gamepad2, title: 'Mini-game', goal: 'Practise reading', instructions: 'Answer every question to complete the activity.' };
  const prompts = useMemo<GamePrompt[]>(() => {
    const content = (game?.content ?? {}) as GameContent;
    const wordLimit = isSpelling ? (spellingDifficulty ? SPELLING_WORD_COUNTS[spellingDifficulty] : 0) : MAX_WORD_BUILDER_WORDS;
    const words = (content.words ?? []).slice(0, wordLimit);
    const questions = content.questions ?? [];

    return isQuiz ? questions : words.map((word) => ({
      question: isSpelling ? 'Spell this word from memory' : 'Tap the letters to build this book word',
      options: [],
      answer: word,
      scrambled: isSpelling ? undefined : shuffleLetters(word),
    }));
  }, [game, isQuiz, isSpelling, spellingDifficulty]);

  useEffect(() => {
    if (!isSpelling || !spellingDifficulty || spellingStage !== 'memorise') return undefined;
    if (memoriseSecondsLeft === 0) {
      setSpellingStage('write');
      return undefined;
    }
    const timer = window.setTimeout(() => setMemoriseSecondsLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [isSpelling, memoriseSecondsLeft, spellingDifficulty, spellingStage]);

  function chooseSpellingDifficulty(difficulty: SpellingDifficulty) {
    setSpellingDifficulty(difficulty);
    setAnswers({});
    setSpellingResponse('');
    setResult(null);
    setMemoriseSecondsLeft(30);
    setSpellingStage('memorise');
  }

  function chooseQuizAnswer(option: string) {
    if (answers[quizIndex]) return;
    setAnswers({ ...answers, [quizIndex]: option });
  }

  function useQuizHint() {
    setQuizHintsUsed({ ...quizHintsUsed, [quizIndex]: true });
  }

  function nextQuizQuestion() {
    if (!answers[quizIndex]) {
      setSubmitError('Choose an answer before moving on.');
      return;
    }
    setSubmitError(null);
    if (quizIndex < prompts.length - 1) setQuizIndex((index) => index + 1);
  }

  function replayQuiz() {
    setAnswers({});
    setQuizHintsUsed({});
    setQuizIndex(0);
    setSubmitError(null);
    setResult(null);
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

  function updateSpellingResponse(value: string) {
    setSpellingResponse(value);
    setAnswers(Object.fromEntries(value.split(/\r?\n/).map((word, index) => [index, word])));
  }

  function selectLetter(questionIndex: number, letterIndex: number, letters: string[]) {
    const selected = selectedLetters[questionIndex] || [];
    if (selected.includes(letterIndex)) return;
    const next = [...selected, letterIndex];
    setSelectedLetters({ ...selectedLetters, [questionIndex]: next });
    setAnswers({ ...answers, [questionIndex]: next.map((index) => letters[index]).join('') });
  }

  function resetLetters(questionIndex: number) {
    setSelectedLetters({ ...selectedLetters, [questionIndex]: [] });
    setAnswers({ ...answers, [questionIndex]: '' });
  }

  async function finishGame() {
    setSubmitError(null);
    if (!childId) return setSubmitError('Choose a child before finishing the game.');
    if (!prompts.length) return setSubmitError('This game does not have any questions yet.');
    if (prompts.some((_, index) => !answers[index]?.trim())) return setSubmitError('Answer every question before finishing.');

    const correct = prompts.filter((prompt, index) => answers[index]?.trim().toLowerCase() === prompt.answer.toLowerCase()).length;
    const score = isQuiz
      ? prompts.reduce((total, prompt, index) => {
        if (answers[index]?.trim().toLowerCase() !== prompt.answer.toLowerCase()) return total;
        return total + (quizHintsUsed[index] ? 5 : 10);
      }, 0)
      : correct * 10;
    setSubmitting(true);
    try {
      const res = await miniGamesApi.submitResult(id, { child_id: Number(childId), score });
      setResult(res.data.game_result);
      if (isSpelling) setSpellingStage('feedback');
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setSubmitError(apiErr.fields?.length ? apiErr.fields : apiErr.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!game || !children) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;

  const correctAnswers = prompts.filter((prompt, index) => answers[index]?.trim().toLowerCase() === prompt.answer.toLowerCase()).length;
  const answeredPromptCount = prompts.filter((_, index) => Boolean(answers[index]?.trim())).length;
  const currentQuizPrompt = prompts[quizIndex];
  const currentQuizAnswer = currentQuizPrompt ? answers[quizIndex] : undefined;
  const currentQuizCorrect = Boolean(currentQuizPrompt && currentQuizAnswer && currentQuizAnswer.trim().toLowerCase() === currentQuizPrompt.answer.toLowerCase());
  const GameIcon = details.icon;

  return (
    <div className="max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl bg-brand-400/10 p-5">
        <GameIcon className="h-8 w-8 text-brand-600" aria-hidden="true" />
        <h1 className="mt-2 text-2xl font-semibold text-brand-900">{details.title}</h1>
        <p className="mt-1 text-sm font-medium text-brand-600">Goal: {details.goal}</p>
        <p className="mt-2 text-sm text-muted">{details.instructions}</p>
        <Badge tone="neutral" className="mt-3 capitalize">{game.difficulty}</Badge>
      </div>

      <Card className="mt-6 space-y-6">
        <Select label="Playing as" value={childId} onChange={(e) => selectChild(e.target.value)}>
          <option value="">Choose a child</option>
          {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
        </Select>

        {isSpelling && (
          <>
            <div>
              <p className="text-sm font-semibold text-brand-900">Choose your challenge</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(SPELLING_WORD_COUNTS) as SpellingDifficulty[]).map((difficulty) => (
                  <button key={difficulty} type="button" disabled={spellingStage !== 'choose'} onClick={() => chooseSpellingDifficulty(difficulty)} className={`rounded-xl border-2 px-2 py-3 text-sm font-bold capitalize transition hover:-translate-y-0.5 disabled:cursor-not-allowed ${spellingDifficulty === difficulty ? 'border-brand-500 bg-brand-400/15 text-brand-900 shadow-sm' : 'border-brand-100 bg-surface text-muted'}`}>
                    {difficulty}<span className="mt-1 block text-xs font-normal">{SPELLING_WORD_COUNTS[difficulty]} words</span>
                  </button>
                ))}
              </div>
            </div>
            {spellingStage !== 'choose' && <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              {(['memorise', 'write', 'feedback'] as SpellingStage[]).map((stage, index) => (
                <div key={stage} className={`rounded-full px-2 py-2 capitalize transition ${spellingStage === stage ? 'bg-brand-500 text-white shadow-md' : 'bg-brand-50 text-brand-700'}`}>{index + 1}. {stage}</div>
              ))}
            </div>}
          </>
        )}

        {isQuiz ? result ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-white to-violet-200/70 p-4 text-center shadow-inner sm:p-7">
            <Sparkles className="absolute left-6 top-4 h-6 w-6 animate-bounce text-amber-500" aria-hidden="true" />
            <PartyPopper className="absolute right-8 top-8 h-7 w-7 animate-pulse text-violet-500" aria-hidden="true" />
            <Trophy className="mx-auto h-16 w-16 animate-bounce text-amber-500" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-black text-brand-900">Story word champion!</h2>
            <p className="mt-2 text-lg font-semibold text-brand-700">You unlocked {correctAnswers} of {prompts.length} story words.</p>
            <div className="mx-auto mt-5 max-w-sm rounded-2xl bg-white/85 p-4 shadow-sm"><p className="text-sm text-muted">Your reward</p><p className="mt-1 text-3xl font-black text-brand-900">{result.score} <span className="text-base text-brand-600">points</span></p></div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {prompts.map((prompt, index) => {
                const correct = answers[index]?.trim().toLowerCase() === prompt.answer.toLowerCase();
                return <span key={index} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{correct ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />} {prompt.word || prompt.answer}</span>;
              })}
            </div>
            <Button type="button" onClick={replayQuiz} className="mt-6"><RotateCcw className="h-4 w-4" aria-hidden="true" />Play again</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {!currentQuizPrompt ? (
              <EmptyState title="Quiz questions are coming soon" description="This book needs a little more story content before the quiz can begin." />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Question {quizIndex + 1} of {prompts.length}</p><p className="mt-1 text-sm font-semibold text-brand-900">{currentQuizCorrect ? 'Great story memory!' : currentQuizAnswer ? 'Nice try — read the clue again.' : 'Pick the best answer.'}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800"><Flame className="h-3.5 w-3.5" aria-hidden="true" />{correctAnswers} points</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500 transition-all" style={{ width: `${((quizIndex + 1) / prompts.length) * 100}%` }} /></div>
                <div className="relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 text-center sm:p-6"><Star className="absolute -right-2 -top-3 h-14 w-14 text-violet-500 opacity-20" aria-hidden="true" /><p className="text-lg font-extrabold leading-snug text-brand-900 sm:text-xl">{currentQuizPrompt.question}</p><p className="mt-3 text-xs font-semibold text-violet-700">Story word detective clue</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentQuizPrompt.options.map((option, optionIndex) => {
                    const selected = currentQuizAnswer === option;
                    const correctOption = currentQuizAnswer && option === currentQuizPrompt.answer;
                    const optionState = selected ? (currentQuizCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-rose-400 bg-rose-50 text-rose-900') : correctOption ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900' : 'border-brand-100 bg-surface text-brand-900';
                    return <button key={option} type="button" disabled={Boolean(currentQuizAnswer)} onClick={() => chooseQuizAnswer(option)} className={`group flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-semibold transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md disabled:cursor-default ${optionState}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-sm font-black text-violet-700 shadow-sm">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{selected && <span className="ml-auto" aria-hidden="true">{currentQuizCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lightbulb className="h-5 w-5 text-amber-600" />}</span>}</button>;
                  })}
                </div>
                {currentQuizAnswer && <div className={`rounded-2xl p-4 ${currentQuizCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}><p className="font-bold">{currentQuizCorrect ? `You got it! +${quizHintsUsed[quizIndex] ? 5 : 10} points` : `The story answer is “${currentQuizPrompt.answer}”.`}</p><p className="mt-1 text-sm">{currentQuizPrompt.explanation || 'That answer fits the story context.'}</p></div>}
                <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={useQuizHint} disabled={Boolean(currentQuizAnswer) || Boolean(quizHintsUsed[quizIndex])} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"><Lightbulb className="h-4 w-4" aria-hidden="true" />{quizHintsUsed[quizIndex] ? 'Hint used' : 'Need a hint? (-5 points)'}</button>{quizHintsUsed[quizIndex] && !currentQuizAnswer && <p className="text-sm font-medium text-amber-800">{currentQuizPrompt.hint || 'Think about how the word was used in the story.'}</p>}{currentQuizAnswer && <Button type="button" onClick={quizIndex === prompts.length - 1 ? finishGame : nextQuizQuestion} loading={submitting}>{quizIndex === prompts.length - 1 ? <><Trophy className="h-4 w-4" aria-hidden="true" />Collect my points</> : <>Next story word<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</Button>}</div>
              </>
            )}
          </div>
        ) : isSpelling && spellingStage === 'choose' ? (
          <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 text-center">
            <p className="font-bold text-brand-900">Choose a challenge to begin</p>
            <p className="mt-1 text-sm text-muted">The 30-second memory timer starts only after you select a difficulty.</p>
          </div>
        ) : isSpelling && spellingStage === 'memorise' ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 via-white to-brand-400/15 p-5 text-center">
            <Sparkles className="absolute left-4 top-3 h-6 w-6 animate-pulse text-violet-500" aria-hidden="true" /><Star className="absolute bottom-3 right-4 h-6 w-6 animate-bounce text-amber-500" aria-hidden="true" />
            <p className="text-sm font-bold text-brand-700">Memory magic time!</p>
            <p className="mt-1 text-sm text-muted">Look carefully and remember these words before the timer ends.</p>
            <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-brand-400 bg-white text-2xl font-black text-brand-900 shadow-lg transition-transform animate-pulse">{memoriseSecondsLeft}</div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {prompts.map((prompt) => <span key={prompt.answer} className="animate-bounce rounded-xl bg-white px-3 py-2 text-lg font-bold text-brand-900 shadow-sm">{prompt.answer}</span>)}
            </div>
            <Button type="button" onClick={() => setSpellingStage('write')} className="mt-5">I am ready to spell!</Button>
          </div>
        ) : isSpelling && spellingStage === 'feedback' && result ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-brand-50 to-brand-300/20 p-7 text-center">
            <Trophy className="mx-auto h-16 w-16 animate-bounce text-amber-500" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-bold text-brand-900">Fantastic spelling!</h2>
            <p className="mt-2 text-lg text-brand-700">You spelled {correctAnswers} out of {prompts.length} words correctly.</p>
            <div className="mt-4 space-y-2 text-left">
              {prompts.map((prompt, index) => {
                const correct = answers[index]?.trim().toLowerCase() === prompt.answer.toLowerCase();
                return <div key={index} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  <span>{index + 1}. {answers[index]?.trim() || 'No answer'}</span>
                  <span>{correct ? 'Correct' : 'Incorrect'}</span>
                </div>;
              })}
            </div>
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-3 font-bold text-brand-900 shadow-sm">You earned {result.score} points! <Sparkles className="h-5 w-5 text-amber-500" aria-hidden="true" /></p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm"><span className="font-medium text-brand-900">{isSpelling ? 'Writing progress' : 'Activity progress'}</span><span className="chip">{answeredPromptCount} of {prompts.length} answered</span></div>

            {isSpelling ? (
              <div className="rounded-xl border border-brand-100 p-4">
                <label htmlFor="spelling-response" className="font-medium text-brand-900">Write the words you remember</label>
                <p className="mt-1 text-sm text-muted">Enter one word on each line. Your spelling will be checked when you finish.</p>
                <textarea id="spelling-response" value={spellingResponse} onChange={(e) => updateSpellingResponse(e.target.value)} rows={Math.max(5, prompts.length)} placeholder="Type one word per line" className="mt-3 w-full rounded-xl border border-brand-200 bg-surface px-3 py-3 text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-400/20" />
              </div>
            ) : prompts.map((prompt, index) => (
          <div key={index} className="rounded-xl border border-brand-100 p-4">
            <p className="font-medium text-brand-900">{index + 1}. {prompt.question}</p>
            {isQuiz ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {prompt.options.map((option) => (
                  <label key={option} className={`cursor-pointer rounded-lg border p-3 text-sm ${answers[index] === option ? 'border-brand-500 bg-brand-50' : 'border-brand-100'}`}>
                    <input className="mr-2" type="radio" name={`question-${index}`} value={option} checked={answers[index] === option} onChange={() => setAnswers({ ...answers, [index]: option })} />
                    {option}
                  </label>
                ))}
              </div>
            ) : !isSpelling && prompt.scrambled ? (
              <div className="mt-4">
                <div className="min-h-14 rounded-xl border border-dashed border-brand-400/60 bg-brand-400/10 px-3 py-3 text-center">
                  {selectedLetters[index]?.length ? (
                    <span className="font-mono text-xl font-bold uppercase tracking-[0.25em] text-brand-900">{answers[index]}</span>
                  ) : <span className="text-sm text-muted">Your word will appear here</span>}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {prompt.scrambled.map((letter, letterIndex) => (
                    <button
                      key={`${letter}-${letterIndex}`}
                      type="button"
                      disabled={selectedLetters[index]?.includes(letterIndex)}
                      onClick={() => selectLetter(index, letterIndex, prompt.scrambled || [])}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/35 bg-surface text-lg font-bold uppercase text-brand-900 shadow-sm transition hover:-translate-y-1 hover:bg-brand-400/15 disabled:scale-90 disabled:opacity-35"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => resetLetters(index)} className="mx-auto mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Start this word again</button>
              </div>
            ) : (
              <Input className="mt-3" value={answers[index] ?? ''} onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })} placeholder="Type the unscrambled word" />
            )}
          </div>
            ))}

            <Alert>{submitError}</Alert>
            {result && <Alert tone="success">Great work! You earned {result.score} points. Your score has been saved to the leaderboard.</Alert>}
            <Button type="button" onClick={finishGame} loading={submitting} disabled={Boolean(result)} className="w-full"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{result ? 'Activity complete!' : isSpelling ? 'See my results!' : 'Finish game'}</Button>
          </>
        )}
      </Card>
      <ChildPinModal child={pendingChild} onClose={() => setPendingChild(null)} onVerified={(child) => setChildId(String(child.id))} />
    </div>
  );
}
