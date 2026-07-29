'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Circle,
  Flame,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { childrenApi, leaderboardApi } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth-context';
import { ApiErrorShape, LeaderboardEntry, LeaderboardResponse } from '@/lib/types';

const podiumStyles = {
  first: {
    card: 'order-1 lg:order-2 border-amber-300/80 bg-gradient-to-b from-amber-50/10 to-brand-900/70 shadow-[0_0_28px_rgba(224,164,56,.18)]',
    medal: 'bg-gradient-to-br from-amber-300 to-amber-600 text-amber-950',
    platform: 'h-5 bg-gradient-to-r from-amber-500/50 to-amber-300/20',
    label: '1st place',
  },
  second: {
    card: 'order-2 lg:order-1 border-slate-300/50 bg-gradient-to-b from-slate-200/10 to-brand-900/70',
    medal: 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950',
    platform: 'h-4 bg-gradient-to-r from-slate-400/40 to-brand-400/20',
    label: '2nd place',
  },
  third: {
    card: 'order-3 border-orange-300/50 bg-gradient-to-b from-orange-100/10 to-brand-900/70',
    medal: 'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950',
    platform: 'h-3 bg-gradient-to-r from-orange-500/40 to-amber-300/20',
    label: '3rd place',
  },
} as const;

type PodiumPosition = keyof typeof podiumStyles;

export default function LeaderboardPage() {
  const { isAdmin } = useAuth();
  const [week, setWeek] = useState('current');
  const [weekInput, setWeekInput] = useState('');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myChildIds, setMyChildIds] = useState<number[]>([]);

  useEffect(() => {
    if (isAdmin) return;
    childrenApi
      .list()
      .then((res) => setMyChildIds(res.data.children.map((child: { id: number }) => child.id)))
      .catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    leaderboardApi
      .list(week)
      .then((res) => {
        if (!cancelled) setData(res.data as LeaderboardResponse);
      })
      .catch((err: ApiErrorShape) => {
        if (!cancelled) setError(err.message || 'Could not load the leaderboard.');
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  const entries = useMemo(
    () => [...(data?.leaderboard || [])].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)),
    [data],
  );
  const stats = useMemo(() => ({
    readers: entries.length,
    points: entries.reduce((sum, entry) => sum + (entry.points || 0), 0),
    streak: entries.reduce((max, entry) => Math.max(max, entry.streak_count || 0), 0),
    topScore: entries.reduce((max, entry) => Math.max(max, entry.points || 0), 0),
  }), [entries]);
  const podium = useMemo(() => entries.slice(0, 3), [entries]);
  const remainingEntries = useMemo(() => entries.slice(3), [entries]);

  function applyWeek(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWeek(weekInput.trim() || 'current');
  }

  function resetWeek() {
    setWeekInput('');
    setWeek('current');
  }

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-3xl border border-brand-400/30 bg-gradient-to-br from-brand-900 via-brand-600 to-violet-600 p-6 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
        <Sparkles className="absolute right-24 top-8 h-5 w-5 text-amber-300" aria-hidden="true" />
        <Sparkles className="absolute bottom-8 right-12 h-4 w-4 text-cyan-200" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.18em] text-cyan-100">Leaderboard</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Leaderboard</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Celebrate our amazing young readers! Keep reading, earning points, and climbing to the top!</p>
          </div>
          <div className="relative grid h-32 w-32 shrink-0 place-items-center self-center rounded-full border border-white/20 bg-white/10 shadow-inner sm:mr-8" aria-label="Trophy illustration" role="img">
            <Trophy className="h-16 w-16 text-amber-300" strokeWidth={1.6} aria-hidden="true" />
            <Sparkles className="absolute -right-4 top-1 h-5 w-5 text-amber-300" aria-hidden="true" />
            <Circle className="absolute -bottom-1 -left-2 h-3.5 w-3.5 fill-cyan-200 text-cyan-200" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface/80 p-4 shadow-card sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-400">Reading challenge</p>
          <p className="mt-1 text-sm text-muted">{data?.week_start ? `Week of ${formatDate(data.week_start)}` : 'See who is shining this week'}</p>
        </div>
        <form onSubmit={applyWeek} className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <Button type="button" variant={week === 'current' ? 'primary' : 'ghost'} onClick={resetWeek}>This Week</Button>
          <Input label="Custom week" type="date" value={weekInput} onChange={(event) => setWeekInput(event.target.value)} className="min-w-[9.5rem] sm:w-44" />
          <Button type="submit" variant="secondary">Apply</Button>
          {week !== 'current' && <Button type="button" variant="ghost" onClick={resetWeek}>Reset</Button>}
        </form>
      </section>

      {error && <Alert>{error}</Alert>}
      {!data && !error && <section className="card flex min-h-56 items-center justify-center"><Spinner size={30} /></section>}
      {data && entries.length === 0 && <EmptyState title="No points logged for this week" description="Every story, session, and mini-game can help a young reader make their mark." />}

      {data && entries.length > 0 && (
        <>
          <section aria-labelledby="podium-heading" className="rounded-3xl border border-border/60 bg-gradient-to-b from-brand-900/90 to-surface/90 p-4 shadow-card sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-400">This week&apos;s stars</p><h2 id="podium-heading" className="mt-1 text-xl font-bold text-brand-900">Top readers</h2></div><Sparkles className="h-6 w-6 text-amber-300" aria-hidden="true" /></div>
            <div className="flex flex-col items-stretch justify-end gap-4 lg:flex-row lg:items-end lg:gap-5">
              {(['second', 'first', 'third'] as PodiumPosition[]).map((position, index) => {
                const entry = podium[position === 'first' ? 0 : position === 'second' ? 1 : 2];
                return entry ? <PodiumCard key={entry.id} entry={entry} position={position} mine={!isAdmin && myChildIds.includes(entry.child_id)} /> : <div key={position} className={`hidden min-h-24 flex-1 lg:block ${index === 1 ? 'lg:order-2' : ''}`} />;
              })}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Leaderboard summary">
            <MetricCard icon={UsersRound} label="Total readers" value={stats.readers.toLocaleString()} detail="Readers on the board" />
            <MetricCard icon={Star} label="Weekly points" value={stats.points.toLocaleString()} detail="Points earned together" />
            <MetricCard icon={Flame} label="Longest streak" value={stats.streak.toLocaleString()} detail="Days of reading momentum" />
            <MetricCard icon={Trophy} label="Top score" value={stats.topScore.toLocaleString()} detail="Best score this week" />
          </section>

          {remainingEntries.length > 0 && <LeaderboardList entries={remainingEntries} myChildIds={isAdmin ? [] : myChildIds} />}
        </>
      )}
    </div>
  );
}

function PodiumCard({ entry, position, mine }: { entry: LeaderboardEntry; position: PodiumPosition; mine: boolean }) {
  const style = podiumStyles[position];
  return <article className={`relative flex-1 rounded-2xl border p-5 text-center text-white transition-transform hover:-translate-y-1 ${style.card}`}>
    <div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-full text-lg font-black shadow-lg ${style.medal}`}>{position === 'first' ? '1' : position === 'second' ? '2' : '3'}</span><span className="text-xs font-semibold uppercase tracking-wider text-blue-100">{style.label}</span></div>
    <Avatar entry={entry} size="lg" />
    <h3 className="mt-3 truncate text-lg font-bold">{entry.child_name?.trim() || 'Reader'}</h3>
    {mine && <span className="mt-2 inline-flex rounded-full bg-cyan-300/15 px-2.5 py-1 text-xs font-semibold text-cyan-100">Yours</span>}
    <p className="mt-3 text-2xl font-black text-amber-200">{(entry.points || 0).toLocaleString()} <span className="text-xs font-semibold text-blue-100">points</span></p>
    <div className={`-mx-5 -mb-5 mt-5 rounded-b-2xl ${style.platform}`} aria-hidden="true" />
  </article>;
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return <article className="card group p-4 transition-transform hover:-translate-y-1"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400/25 to-violet-500/25 text-brand-600" aria-hidden="true"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 text-2xl font-black text-brand-900">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div></div></article>;
}

function Avatar({ entry, size = 'sm' }: { entry: LeaderboardEntry; size?: 'sm' | 'lg' }) {
  const name = entry.child_name?.trim() || 'Reader';
  const palette = ['from-brand-400 to-violet-500', 'from-cyan-300 to-brand-600', 'from-amber-300 to-orange-500', 'from-fuchsia-400 to-violet-600'];
  const seed = Math.abs((entry.child_id * 31) + name.length) % palette.length;
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${palette[seed]} ${size === 'lg' ? 'mx-auto mt-5 h-20 w-20 text-3xl ring-4 ring-white/10' : 'h-10 w-10 text-sm'}`} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
}

function AchievementBadge({ entry }: { entry: LeaderboardEntry }) {
  const label = entry.rank <= 3 ? 'Top Reader' : (entry.streak_count || 0) >= 10 ? 'Streak Hero' : entry.points >= 1500 ? 'Star Reader' : entry.points >= 750 ? 'Book Explorer' : 'Rising Reader';
  const tone = label === 'Top Reader' || label === 'Star Reader' ? 'bg-amber-300/15 text-amber-300' : label === 'Streak Hero' ? 'bg-orange-300/15 text-orange-300' : label === 'Book Explorer' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-violet-300/15 text-violet-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function LeaderboardList({ entries, myChildIds }: { entries: LeaderboardEntry[]; myChildIds: number[] }) {
  return <section className="card p-0" aria-labelledby="all-readers-heading"><div className="border-b border-border/60 p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-400">Keep climbing</p><h2 id="all-readers-heading" className="mt-1 text-xl font-bold text-brand-900">All readers</h2></div>
    <div className="hidden overflow-hidden rounded-b-2xl md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Leaderboard entries ranked from fourth place onward</caption><thead><tr className="border-b border-border/60 bg-bg/40 text-xs uppercase tracking-wider text-muted"><th scope="col" className="px-5 py-3">Rank</th><th scope="col" className="px-5 py-3">Child</th><th scope="col" className="px-5 py-3">Points</th><th scope="col" className="px-5 py-3">Streak</th><th scope="col" className="px-5 py-3">Badge</th></tr></thead><tbody className="divide-y divide-border/60">{entries.map((entry) => <LeaderboardRow key={entry.id} entry={entry} mine={myChildIds.includes(entry.child_id)} />)}</tbody></table></div>
    <div className="space-y-3 p-3 md:hidden">{entries.map((entry) => <div key={entry.id} className={`rounded-2xl border border-border/60 p-4 ${myChildIds.includes(entry.child_id) ? 'bg-brand-400/10' : 'bg-bg/30'}`}><div className="flex items-center gap-3"><span className="w-8 font-bold text-brand-400">#{entry.rank}</span><Avatar entry={entry} /><div className="min-w-0 flex-1"><p className="truncate font-bold text-brand-900">{entry.child_name?.trim() || 'Reader'}</p>{myChildIds.includes(entry.child_id) && <span className="chip mt-1">Yours</span>}</div><AchievementBadge entry={entry} /></div><div className="mt-4 flex justify-between text-sm"><span className="font-bold text-brand-600">{(entry.points || 0).toLocaleString()} pts</span><span className="inline-flex items-center gap-1 text-muted" aria-label={`${entry.streak_count || 0} day streak`}><Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />{entry.streak_count || 0} days</span></div></div>)}</div>
  </section>;
}

function LeaderboardRow({ entry, mine }: { entry: LeaderboardEntry; mine: boolean }) {
  return <tr className={`transition-colors hover:bg-brand-400/5 ${mine ? 'bg-brand-400/10' : ''}`}><td className="px-5 py-4 font-bold text-brand-400">#{entry.rank}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><Avatar entry={entry} /><div><p className="font-bold text-brand-900">{entry.child_name?.trim() || 'Reader'}</p>{mine && <span className="chip mt-1">Yours</span>}</div></div></td><td className="px-5 py-4 font-bold text-brand-600">{(entry.points || 0).toLocaleString()}</td><td className="px-5 py-4 text-muted" aria-label={`${entry.streak_count || 0} day streak`}><span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />{entry.streak_count || 0}</span></td><td className="px-5 py-4"><AchievementBadge entry={entry} /></td></tr>;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString();
}
