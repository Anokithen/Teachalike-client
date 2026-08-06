'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
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
import { ChildPinModal } from '@/components/children/ChildPinModal';
import {
  ApiErrorShape,
  Child,
  MiniGame,
  MiniGameResultResponse,
  PublicQuizQuestion,
  QuizSkill,
  SpellingWord,
  WordPuzzleWord,
} from '@/lib/types';

type SpellingDifficulty = 'easy' | 'medium' | 'hard';
type SpellingStage = 'choose' | 'memorise' | 'write';

const SPELLING_WORD_COUNTS: Record<SpellingDifficulty, number> = { easy: 3, medium: 6, hard: 10 };
const GAME_DETAILS: Record<string, { icon: LucideIcon; title: string; goal: string; instructions: string }> = {
  word_puzzle: { icon: Puzzle, title: 'Word builder', goal: 'Build story words', instructions: 'Use the mixed-up letters to type each word from the book.' },
  spelling: { icon: Pencil, title: 'Spelling practice', goal: 'Remember book words', instructions: 'Look carefully, hide the words, then spell each one.' },
  quiz: { icon: Sparkles, title: 'Story challenge', goal: 'Remember the story', instructions: 'Choose the best answer using clues from the book.' },
};
const SKILL_LABELS: Record<QuizSkill, string> = {
  story_comprehension: 'Story Memory',
  character: 'Characters',
  event: 'Story Events',
  sequence: 'What Happened Next',
  vocabulary: 'Word Meaning',
  main_idea: 'Big Idea',
};

function isSpellingWord(word: SpellingWord | WordPuzzleWord): word is SpellingWord {
  return 'word' in word;
}

function isPuzzleWord(word: SpellingWord | WordPuzzleWord): word is WordPuzzleWord {
  return 'scrambled_letters' in word;
}

export default function MiniGamePage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<MiniGame | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [childId, setChildId] = useState('');
  const [pendingChild, setPendingChild] = useState<Child | null>(null);
  const [quizSelections, setQuizSelections] = useState<Record<string, number>>({});
  const [wordResponses, setWordResponses] = useState<Record<string, string>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [spellingDifficulty, setSpellingDifficulty] = useState<SpellingDifficulty | null>(null);
  const [spellingStage, setSpellingStage] = useState<SpellingStage>('choose');
  const [memoriseSecondsLeft, setMemoriseSecondsLeft] = useState(30);
  const [result, setResult] = useState<MiniGameResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const [gameResponse, childrenResponse] = await Promise.all([
          miniGamesApi.get(id),
          childrenApi.list(),
        ]);
        setGame(gameResponse.data.mini_game);
        setChildren(childrenResponse.data.children);
      } catch (err) {
        setError((err as ApiErrorShape).message);
      }
    }
    void load();
  }, [id]);

  const quizQuestions = useMemo<PublicQuizQuestion[]>(
    () => game?.game_type === 'quiz' ? game.content?.questions ?? [] : [],
    [game],
  );
  const allWords = game?.content?.words ?? [];
  const puzzleWords = game?.game_type === 'word_puzzle' ? allWords.filter(isPuzzleWord) : [];
  const spellingWords = game?.game_type === 'spelling' ? allWords.filter(isSpellingWord) : [];
  const selectedSpellingWords = spellingDifficulty
    ? spellingWords.slice(0, SPELLING_WORD_COUNTS[spellingDifficulty])
    : [];

  useEffect(() => {
    if (game?.game_type !== 'spelling' || spellingStage !== 'memorise') return undefined;
    if (memoriseSecondsLeft <= 0) {
      setSpellingStage('write');
      return undefined;
    }
    const timer = window.setTimeout(
      () => setMemoriseSecondsLeft((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [game?.game_type, memoriseSecondsLeft, spellingStage]);

  function selectChild(value: string) {
    if (!value) {
      setChildId('');
      setPendingChild(null);
      return;
    }
    const selected = children?.find((child) => String(child.id) === value) ?? null;
    setChildId('');
    if (selected?.has_pin) setPendingChild(selected);
    else if (selected) setChildId(String(selected.id));
  }

  function resetGame() {
    setQuizSelections({});
    setWordResponses({});
    setHintsUsed({});
    setQuizIndex(0);
    setSpellingDifficulty(null);
    setSpellingStage('choose');
    setMemoriseSecondsLeft(30);
    setResult(null);
    setSubmitError(null);
  }

  function chooseSpellingDifficulty(difficulty: SpellingDifficulty) {
    setSpellingDifficulty(difficulty);
    setWordResponses({});
    setMemoriseSecondsLeft(30);
    setSpellingStage('memorise');
  }

  async function finishGame() {
    if (!game) return;
    setSubmitError(null);
    if (!childId) {
      setSubmitError('Choose a child before finishing the game.');
      return;
    }

    let answers: Array<
      { question_id: string; selected_option_index: number; hint_used: boolean }
      | { word_id: string; response: string }
    > = [];
    if (game.game_type === 'quiz') {
      if (quizQuestions.some((question) => quizSelections[question.id] === undefined)) {
        setSubmitError('Answer every story question before collecting your points.');
        return;
      }
      answers = quizQuestions.map((question) => ({
        question_id: question.id,
        selected_option_index: quizSelections[question.id],
        hint_used: Boolean(hintsUsed[question.id]),
      }));
    } else {
      const words = game.game_type === 'spelling' ? selectedSpellingWords : puzzleWords;
      if (!words.length || words.some((word) => !wordResponses[word.id]?.trim())) {
        setSubmitError('Try every word before finishing the activity.');
        return;
      }
      answers = words.map((word) => ({ word_id: word.id, response: wordResponses[word.id].trim() }));
    }

    setSubmitting(true);
    try {
      const response = await miniGamesApi.submitResult(id, {
        child_id: Number(childId),
        answers,
        ...(game.game_type === 'spelling' && spellingDifficulty
          ? { difficulty: spellingDifficulty }
          : {}),
      });
      setResult(response.data);
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setSubmitError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <div className="space-y-3"><Alert>{error}</Alert><Button type="button" variant="secondary" onClick={() => window.location.reload()}>Try again</Button></div>;
  }
  if (!game || !children) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;

  const details = GAME_DETAILS[game.game_type] ?? { icon: Gamepad2, title: 'Mini-game', goal: 'Practise reading', instructions: 'Complete the activity.' };
  const GameIcon = details.icon;
  const playable = game.generation_status === 'ready' || game.generation_status === 'fallback';
  const currentQuestion = quizQuestions[quizIndex];
  const resultById = new Map(result?.answers.map((answer) => [answer.question_id, answer]) ?? []);

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header className="page-hero grid gap-5 p-5 sm:grid-cols-[7rem_1fr] sm:p-7">
        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-white/80 shadow-card">
          {game.book?.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.book.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : <GameIcon className="h-12 w-12 text-brand-600" aria-hidden="true" />}
        </div>
        <div>
          <p className="text-sm font-extrabold text-brand-600">{game.book?.title ?? 'Book challenge'}</p>
          <h1 className="mt-1 text-3xl font-black text-brand-900">{details.title}</h1>
          <p className="mt-2 text-sm text-muted">{details.instructions}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">{details.goal}</Badge>
            <Badge tone="neutral" className="capitalize">{game.difficulty}</Badge>
            {game.generation_status === 'fallback' && <Badge tone="warning">Book-based challenge</Badge>}
          </div>
        </div>
      </header>

      {!playable ? (
        <Card className="py-12 text-center" role="status">
          {game.generation_status === 'pending' || game.generation_status === 'generating' ? (
            <><Spinner size={32} /><h2 className="mt-4 text-xl font-black text-brand-900">We’re preparing a fun story challenge for you.</h2><p className="mt-2 text-sm text-muted">Please return in a moment.</p></>
          ) : game.generation_status === 'stale' ? (
            <><Clock3 className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black text-brand-900">This story challenge is being refreshed.</h2></>
          ) : (
            <><Puzzle className="mx-auto h-10 w-10 text-brand-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-black text-brand-900">This book needs a little more story text.</h2><p className="mt-2 text-sm text-muted">There are not enough grounded words for a fair challenge yet.</p></>
          )}
        </Card>
      ) : (
        <Card className="space-y-6">
          <Select label="Playing as" value={childId} onChange={(event) => selectChild(event.target.value)}>
            <option value="">Choose a child</option>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </Select>

          {result ? (
            <section className="mini-game-result text-center" aria-live="polite">
              <PartyPopper className="mx-auto h-10 w-10 text-violet-600" aria-hidden="true" />
              <h2 className="mt-3 text-3xl font-black text-brand-900">Wonderful effort!</h2>
              <p className="mt-2 text-lg font-bold text-brand-700">You got {result.game_result.correct_answers ?? 0} of {result.game_result.total_questions ?? 0} correct.</p>
              <div className="mx-auto mt-5 max-w-sm rounded-3xl bg-white/85 p-5 shadow-card">
                <Trophy className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
                <p className="mt-2 text-4xl font-black text-brand-900">{result.game_result.points_awarded ?? result.game_result.score}</p>
                <p className="text-sm font-bold text-brand-600">leaderboard points earned</p>
              </div>
              <div className="mt-6 space-y-3 text-left">
                {result.answers.map((answer, index) => (
                  <article key={answer.question_id} className={`rounded-2xl border-2 p-4 ${answer.correct ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                    <p className="flex items-center gap-2 font-extrabold text-brand-900">
                      {answer.correct ? <Check className="h-5 w-5 text-emerald-700" aria-hidden="true" /> : <X className="h-5 w-5 text-amber-700" aria-hidden="true" />}
                      {answer.correct ? 'Great thinking!' : 'Almost! Let’s look at the story clue.'} <span className="sr-only">Answer {index + 1}</span>
                    </p>
                    <p className="mt-1 text-sm text-brand-800">{answer.explanation}</p>
                  </article>
                ))}
              </div>
              <Button type="button" onClick={resetGame} className="mt-6"><RotateCcw className="h-4 w-4" aria-hidden="true" />Play again</Button>
            </section>
          ) : game.game_type === 'quiz' ? (
            currentQuestion ? (
              <section className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-brand-700">Question {quizIndex + 1} of {quizQuestions.length}</p>
                  <div className="flex gap-2"><Badge tone="warning" className="capitalize">{currentQuestion.difficulty}</Badge><Badge tone="brand">{SKILL_LABELS[currentQuestion.skill]}</Badge></div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-brand-100" aria-label={`${quizIndex + 1} of ${quizQuestions.length} questions`}><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} /></div>
                <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 text-center"><Star className="mx-auto h-6 w-6 text-amber-500" aria-hidden="true" /><h2 className="mt-2 text-xl font-black leading-snug text-brand-900 sm:text-2xl">{currentQuestion.question}</h2></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = quizSelections[currentQuestion.id] === optionIndex;
                    return <button key={option} type="button" aria-pressed={selected} onClick={() => setQuizSelections((previous) => ({ ...previous, [currentQuestion.id]: optionIndex }))} className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left text-base font-bold transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-violet-500 bg-violet-100 text-violet-950' : 'border-brand-100 bg-surface text-brand-900'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">{String.fromCharCode(65 + optionIndex)}</span>{option}{selected && <CheckCircle2 className="ml-auto h-5 w-5" aria-hidden="true" />}</button>;
                  })}
                </div>
                {hintsUsed[currentQuestion.id] && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900"><Lightbulb className="mr-2 inline h-4 w-4" aria-hidden="true" />{currentQuestion.hint}</p>}
                <div className="flex flex-wrap justify-between gap-3">
                  <Button type="button" variant="secondary" onClick={() => setHintsUsed((previous) => ({ ...previous, [currentQuestion.id]: true }))} disabled={Boolean(hintsUsed[currentQuestion.id])}><Lightbulb className="h-4 w-4" aria-hidden="true" />{hintsUsed[currentQuestion.id] ? 'Hint used' : 'Show a hint (-5)'}</Button>
                  <Button type="button" disabled={quizSelections[currentQuestion.id] === undefined} loading={submitting} onClick={() => quizIndex === quizQuestions.length - 1 ? void finishGame() : setQuizIndex((index) => index + 1)}>{quizIndex === quizQuestions.length - 1 ? <><Trophy className="h-4 w-4" aria-hidden="true" />Finish challenge</> : <>Next question<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</Button>
                </div>
              </section>
            ) : <p className="text-center text-muted">This quiz needs more story content.</p>
          ) : game.game_type === 'spelling' ? (
            <section className="space-y-5">
              {spellingStage === 'choose' && <><h2 className="text-center text-xl font-black text-brand-900">Choose your spelling challenge</h2><div className="grid gap-3 min-[420px]:grid-cols-3">{(['easy', 'medium', 'hard'] as SpellingDifficulty[]).map((difficulty) => <button key={difficulty} type="button" onClick={() => chooseSpellingDifficulty(difficulty)} className="min-h-20 rounded-2xl border-2 border-brand-200 bg-surface p-3 font-black capitalize text-brand-900 shadow-sm transition hover:-translate-y-1 hover:border-brand-500">{difficulty}<span className="mt-1 block text-xs font-semibold text-muted">Up to {SPELLING_WORD_COUNTS[difficulty]} words</span></button>)}</div></>}
              {spellingStage === 'memorise' && <div className="rounded-3xl bg-gradient-to-br from-cyan-50 to-violet-100 p-6 text-center dark:from-[#123A45] dark:to-[#252542]"><p className="font-black text-brand-900">Memory magic time · {memoriseSecondsLeft}s</p><p className="mt-1 text-sm text-muted">Look carefully. The words will hide when you are ready.</p><div className="mt-5 flex flex-wrap justify-center gap-3">{selectedSpellingWords.map((word) => <span key={word.id} className="rounded-xl bg-white px-4 py-2 text-lg font-black text-brand-900 shadow-sm">{word.word}</span>)}</div><Button type="button" className="mt-5" onClick={() => setSpellingStage('write')}>I’m ready to spell!</Button></div>}
              {spellingStage === 'write' && <><p className="text-sm font-bold text-muted">Type each word you remember. The server will check your spelling.</p>{selectedSpellingWords.map((word, index) => <div key={word.id}><Input id={`spelling-${word.id}`} label={`Word ${index + 1}`} value={wordResponses[word.id] ?? ''} onChange={(event) => setWordResponses((previous) => ({ ...previous, [word.id]: event.target.value }))} aria-describedby={`spelling-hint-${word.id}`} autoComplete="off" /><p id={`spelling-hint-${word.id}`} className="mt-1 text-xs text-muted">{word.hint}</p></div>)}<Button type="button" className="w-full" onClick={() => void finishGame()} loading={submitting}><Trophy className="h-4 w-4" aria-hidden="true" />See my results</Button></>}
            </section>
          ) : (
            <section className="space-y-4">
              <p className="text-sm font-bold text-muted">Build each hidden story word from its mixed-up letters.</p>
              {puzzleWords.map((word, index) => <div key={word.id} className="rounded-2xl border border-brand-100 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-brand-900">Word {index + 1}</p><Badge tone="neutral" className="capitalize">{word.difficulty}</Badge></div><div className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Mixed-up letters">{word.scrambled_letters.map((letter, letterIndex) => <span key={`${letter}-${letterIndex}`} className="grid h-11 w-11 place-items-center rounded-xl bg-brand-400/15 text-lg font-black uppercase text-brand-900 shadow-sm">{letter}</span>)}</div><Input id={`puzzle-${word.id}`} className="mt-3" value={wordResponses[word.id] ?? ''} onChange={(event) => setWordResponses((previous) => ({ ...previous, [word.id]: event.target.value }))} placeholder="Type the story word" aria-describedby={`puzzle-hint-${word.id}`} autoComplete="off" /><p id={`puzzle-hint-${word.id}`} className="mt-1 text-xs text-muted">{word.hint}</p></div>)}
              <Button type="button" className="w-full" onClick={() => void finishGame()} loading={submitting}><Trophy className="h-4 w-4" aria-hidden="true" />Finish word builder</Button>
            </section>
          )}
          {submitError && <Alert>{submitError}</Alert>}
        </Card>
      )}
      <ChildPinModal child={pendingChild} onClose={() => setPendingChild(null)} onVerified={(child) => setChildId(String(child.id))} />
      <span className="sr-only" aria-live="polite">{result ? `${result.game_result.score} points earned` : ''}</span>
      {resultById.size > 0 && <span className="sr-only">Answer review is available above.</span>}
    </main>
  );
}
