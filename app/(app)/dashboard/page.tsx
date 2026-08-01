/* External admin-provided cover URLs cannot be optimized without a fixed Next image allowlist. */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Baby,
  BookOpen,
  GraduationCap,
  Image as ImageIcon,
  LibraryBig,
  Mic2,
  Plus,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { booksApi, childrenApi, leaderboardApi, voiceProfilesApi } from '@/lib/endpoints';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { ApiErrorShape, Book, Child, ChildStats, LeaderboardEntry, VoiceProfile } from '@/lib/types';
import { BookAttribution } from '@/components/books/BookAttribution';

export default function DashboardPage() {
  const { account, isAdmin, isTeacher } = useAuth();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [childStats, setChildStats] = useState<Record<number, ChildStats>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [childrenResult, leaderboardResult, booksResult, voiceProfilesResult] = await Promise.allSettled([
        childrenApi.list(),
        leaderboardApi.list('current'),
        booksApi.list(),
        voiceProfilesApi.list(),
      ]);
      if (cancelled) return;

      if (childrenResult.status === 'fulfilled') {
        const childList = childrenResult.value.data.children as Child[];
        setChildren(childList);

        const detailResults = await Promise.allSettled(childList.map((child) => childrenApi.get(child.id)));
        if (cancelled) return;
        const stats: Record<number, ChildStats> = {};
        detailResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.data.child?.stats) {
            stats[childList[index].id] = result.value.data.child.stats;
          }
        });
        setChildStats(stats);
      } else {
        setError((childrenResult.reason as ApiErrorShape)?.message || 'Could not load your dashboard.');
      }

      if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value.data.leaderboard);
      if (booksResult.status === 'fulfilled') setBooks(booksResult.value.data.books);
      if (voiceProfilesResult.status === 'fulfilled') setVoiceProfiles(voiceProfilesResult.value.data.voice_profiles);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const totalSessions = useMemo(
    () => Object.values(childStats).reduce((total, stats) => total + (stats.total_sessions || 0), 0),
    [childStats],
  );
  const totalGames = useMemo(
    () => Object.values(childStats).reduce((total, stats) => total + (stats.total_game_results || 0), 0),
    [childStats],
  );
  const childIds = useMemo(() => new Set((children || []).map((child) => child.id)), [children]);
  const familyLeaderboard = (leaderboard || []).filter((entry) => childIds.has(entry.child_id));
  const familyPoints = familyLeaderboard.reduce((total, entry) => total + entry.points, 0);
  const bestRank = familyLeaderboard.reduce<number | null>((best, entry) => (
    best === null || (entry.rank && entry.rank < best) ? entry.rank : best
  ), null);
  const readyVoices = (voiceProfiles || []).filter((profile) => profile.status === 'ready').length;

  const firstName = account?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-700 to-violet-600 p-6 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.18em] text-cyan-100">
              {isAdmin ? 'Platform overview' : 'Your reading space'}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {firstName}!</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              {isAdmin
                ? 'Keep the TeachAlike experience joyful, organised, and ready for every growing reader.'
                : 'Turn a few minutes of reading into a bright little adventure for your family today.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isTeacher && (
              <Link href="/teacher/books/create" className="btn-home-outline gap-2 bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/20">
                <LibraryBig className="h-4 w-4" aria-hidden="true" />
                Create book
              </Link>
            )}
            {!isAdmin && (
              <Link href="/children" className="btn-home-outline gap-2 bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/20">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add child
              </Link>
            )}
            <Link href="/books" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50">
              Explore books
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      {isAdmin ? (
        <AdminDashboard readerList={children} books={books} voiceProfiles={voiceProfiles} leaderboard={leaderboard} />
      ) : (
        <ParentDashboard
          readerList={children}
          childStats={childStats}
          books={books}
          leaderboard={leaderboard}
          familyLeaderboard={familyLeaderboard}
          familyPoints={familyPoints}
          bestRank={bestRank}
          totalSessions={totalSessions}
          totalGames={totalGames}
          readyVoices={readyVoices}
        />
      )}
    </div>
  );
}

function ParentDashboard({
  readerList,
  childStats,
  books,
  leaderboard,
  familyLeaderboard,
  familyPoints,
  bestRank,
  totalSessions,
  totalGames,
  readyVoices,
}: {
  readerList: Child[] | null;
  childStats: Record<number, ChildStats>;
  books: Book[] | null;
  leaderboard: LeaderboardEntry[] | null;
  familyLeaderboard: LeaderboardEntry[];
  familyPoints: number;
  bestRank: number | null;
  totalSessions: number;
  totalGames: number;
  readyVoices: number;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={UsersRound} label="Young readers" value={readerList?.length ?? '—'} detail="Profiles in your family" tone="cyan" />
        <MetricCard icon={BookOpen} label="Reading sessions" value={totalSessions} detail="Stories explored so far" tone="violet" />
        <MetricCard icon={Trophy} label="Family points" value={familyPoints} detail={bestRank ? `Best rank #${bestRank} this week` : 'Play to join the board'} tone="gold" />
        <MetricCard icon={Mic2} label="Ready voices" value={readyVoices} detail="For magical narration" tone="rose" />
      </div>

      {!readerList && <Card className="flex min-h-48 items-center justify-center"><Spinner size={28} /></Card>}

      {readerList && readerList.length === 0 && (
        <Card className="overflow-hidden bg-gradient-to-br from-cyan-50 to-violet-50">
          <EmptyState
            title="Start your family reading journey"
            description="Create a child profile to unlock personalised books, reading sessions, mini-games, and progress tracking."
            action={<Link href="/children" className="btn-primary">Create first profile</Link>}
          />
        </Card>
      )}

      {readerList && readerList.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.85fr)]">
          <Card>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-500">Your learning team</p>
                <h2 className="mt-1 text-xl font-bold text-brand-900">Choose a reader to continue</h2>
              </div>
              <Link href="/children" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:translate-x-0.5 hover:underline">
                Manage
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {readerList.slice(0, 6).map((child) => {
                const stats = childStats[child.id] || {};
                const activity = (stats.total_sessions || 0) + (stats.total_game_results || 0);
                return (
                  <Link key={child.id} href={`/children/${child.id}`} className="group rounded-2xl border border-border bg-bg/60 p-4 transition-all hover:-translate-y-1 hover:border-brand-400/50 hover:bg-white hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500 text-lg font-bold text-white shadow-sm">{child.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-brand-900 group-hover:text-brand-600">{child.name}</h3>
                        <p className="text-xs text-muted">Age {child.age} · {child.reading_level}</p>
                      </div>
                      <ArrowRight className="ml-auto h-5 w-5 text-brand-400 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-white px-3 py-2"><span className="block font-bold text-brand-900">{stats.total_sessions ?? '—'}</span><span className="text-muted">Sessions</span></div>
                      <div className="rounded-xl bg-white px-3 py-2"><span className="block font-bold text-brand-900">{stats.total_game_results ?? '—'}</span><span className="text-muted">Games played</span></div>
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                      {activity ? (
                        <>
                          Keep the momentum going
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          Ready for a first adventure
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="weekly-challenge-card bg-gradient-to-br from-amber-50 via-white to-cyan-50">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-700">Weekly challenge</p><h2 className="mt-1 text-xl font-bold text-brand-900">Make it a bright week</h2></div>
              <Star className="h-8 w-8 fill-amber-300 text-amber-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">Read a story, try a mini-game, and watch your family climb the board together.</p>
            <div className="weekly-challenge-summary mt-5 rounded-2xl bg-white/80 p-4 shadow-sm">
              <div className="flex items-end justify-between"><span className="text-sm font-semibold text-brand-900">Family points</span><span className="text-2xl font-black text-brand-600">{familyPoints}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500 transition-all" style={{ width: `${Math.min(100, familyPoints ? Math.max(12, familyPoints / 2) : 4)}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{bestRank ? `Your best reader is ranked #${bestRank}.` : 'Your first points are waiting.'}</p>
            </div>
            <Link href="/leaderboard" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:translate-x-0.5">
              See the leaderboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-500">Keep exploring</p><h2 className="mt-1 text-xl font-bold text-brand-900">Find the next favourite</h2></div><Link href="/books" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Library <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
          {!books && <div className="flex justify-center py-8"><Spinner /></div>}
          {books && books.length === 0 && <p className="rounded-2xl bg-bg p-4 text-sm text-muted">The library is getting ready for you.</p>}
          {books && books.length > 0 && <div className="grid gap-3 sm:grid-cols-3">{books.slice(0, 3).map((book) => <Link key={book.id} href={`/books/${book.id}`} className="group overflow-hidden rounded-2xl border border-border bg-bg transition-all hover:-translate-y-1 hover:shadow-md">{book.cover_image_url ? (<><span className="sr-only">Book cover</span><img src={book.cover_image_url} alt="" className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105" /></>) : <div className="grid h-24 place-items-center bg-gradient-to-br from-cyan-100 to-violet-100 text-brand-600"><BookOpen className="h-8 w-8" aria-hidden="true" /></div>}<div className="p-3"><h3 className="truncate text-sm font-bold text-brand-900 group-hover:text-brand-600">{book.title}</h3><BookAttribution label={book.created_by_label} className="mt-1 text-xs" /><Badge className="mt-2" tone="neutral">{book.age_group}</Badge></div></Link>)}</div>}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-brand-900">Leaderboard pulse</h2><Link href="/leaderboard" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link></div>
          {!leaderboard && <Spinner />}
          {leaderboard && leaderboard.length === 0 && <p className="text-sm text-muted">No points logged yet this week.</p>}
          {leaderboard && leaderboard.length > 0 && <ol className="space-y-3">{leaderboard.slice(0, 4).map((entry) => <li key={entry.id} className="flex items-center justify-between text-sm"><span className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-400/15 text-xs font-bold text-brand-700">{entry.rank}</span><span className="truncate text-brand-900">{entry.child_name}</span></span><span className="font-bold text-brand-600">{entry.points}</span></li>)}</ol>}
        </Card>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardLink href="/books" icon={BookOpen} title="Browse storybooks" body="Find a new adventure for tonight." />
        <DashboardLink href="/voice-profiles" icon={Mic2} title="Create a story voice" body="Make narration feel personal." />
        <DashboardLink href="/leaderboard" icon={Trophy} title="Celebrate progress" body={`${totalGames} mini-games completed by your family.`} />
      </div>
    </>
  );
}

function AdminDashboard({ readerList, books, voiceProfiles, leaderboard }: { readerList: Child[] | null; books: Book[] | null; voiceProfiles: VoiceProfile[] | null; leaderboard: LeaderboardEntry[] | null }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={UsersRound} label="Readers" value={readerList?.length ?? '—'} detail="Profiles across the platform" tone="cyan" />
        <MetricCard icon={BookOpen} label="Books" value={books?.length ?? '—'} detail="Titles in the library" tone="violet" />
        <MetricCard icon={Mic2} label="Voice profiles" value={voiceProfiles?.length ?? '—'} detail="Uploaded narration voices" tone="rose" />
        <MetricCard icon={Trophy} label="Weekly entries" value={leaderboard?.length ?? '—'} detail="Children earning points" tone="gold" />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardLink href="/admin/parents" icon={UsersRound} title="Manage parents" body="Review family accounts and access." />
        <DashboardLink href="/admin/teachers" icon={GraduationCap} title="Manage teachers" body="Support educators using the platform." />
        <DashboardLink href="/admin/books/new" icon={LibraryBig} title="Add a new book" body="Create stories and mini-games with AI." />
        <DashboardLink href="/children" icon={Baby} title="View all readers" body="Browse profiles and learning activity." />
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
        <Card><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-500">Library pulse</p><h2 className="mt-1 text-xl font-bold text-brand-900">Recently available books</h2></div><Link href="/books" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Open library <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>{books?.length ? <div className="grid gap-3 sm:grid-cols-3">{books.slice(-3).reverse().map((book) => <Link key={book.id} href={`/books/${book.id}`} className="rounded-2xl border border-border bg-bg p-4 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-md">{book.cover_image_url ? <ImageIcon className="h-6 w-6 text-brand-600" aria-hidden="true" /> : <BookOpen className="h-6 w-6 text-brand-600" aria-hidden="true" />}<h3 className="mt-3 truncate text-sm font-bold text-brand-900">{book.title}</h3><BookAttribution label={book.created_by_label} className="mt-1 text-xs" /><p className="mt-1 text-xs text-muted">{book.age_group} · {book.reading_level}</p></Link>)}</div> : <p className="text-sm text-muted">No books have been added yet.</p>}</Card>
        <Card className="bg-gradient-to-br from-violet-50 to-cyan-50"><p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-700">Admin shortcut</p><h2 className="mt-2 text-xl font-bold text-brand-900">Keep the library fresh</h2><p className="mt-3 text-sm leading-6 text-muted">Add a new AI-assisted story, upload illustrations one by one, and make it playable in minutes.</p><Link href="/admin/books/new" className="btn-primary mt-5 inline-flex gap-2">Create a book <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Card>
      </section>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: number | string; detail: string; tone: 'cyan' | 'violet' | 'gold' | 'rose' }) {
  const tones = { cyan: 'bg-cyan-50 text-cyan-700', violet: 'bg-violet-50 text-violet-700', gold: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <Card className="group relative overflow-hidden p-4 transition-all hover:-translate-y-1 hover:shadow-md"><div className={`mb-4 grid h-10 w-10 place-items-center rounded-2xl transition-transform group-hover:scale-110 ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-2xl font-black text-brand-900">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></Card>;
}

function DashboardLink({ href, icon: Icon, title, body }: { href: string; icon: LucideIcon; title: string; body: string }) {
  return <Link href={href} className="group card block p-5 transition-all hover:-translate-y-1 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-400/15 text-brand-600 transition-transform group-hover:scale-110"><Icon className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-4 text-sm font-bold text-brand-900 group-hover:text-brand-600">{title}</h3><p className="mt-1 text-sm leading-5 text-muted">{body}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-transform group-hover:translate-x-1">Open feature <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span></Link>;
}
