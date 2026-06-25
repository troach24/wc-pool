import { useState } from 'react';
import type { WCEvent } from '../lib/api';
import type { MatchImpact } from '../hooks/useLivePoints';

type Props = {
  todayFixtures: WCEvent[];
  matchImpacts: MatchImpact[];
};

function formatKickoff(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function FixtureRow({ event, impacts }: { event: WCEvent; impacts: MatchImpact | undefined }) {
  const live = event.status.type === 'inprogress';
  const finished = event.status.type === 'finished';
  const upcoming = event.status.type === 'notstarted';
  const homeWin = event.homeScore.current > event.awayScore.current;
  const awayWin = event.awayScore.current > event.homeScore.current;
  const group = event.tournament.groupSign ? `GRP ${event.tournament.groupSign}` : event.round;

  return (
    <div className={`flex items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0 ${live ? 'bg-green-500/5' : ''}`}>
      {/* Teams + scores */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-gray-100">
            {event.homeTeam.name}
          </span>
          {!upcoming && (
            <span className={`font-display text-[17px] font-bold tabular-nums ${homeWin ? 'text-[#f0a500]' : 'text-white'}`}>
              {event.homeScore.current}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-gray-100">
            {event.awayTeam.name}
          </span>
          {!upcoming && (
            <span className={`font-display text-[17px] font-bold tabular-nums ${awayWin ? 'text-[#f0a500]' : 'text-white'}`}>
              {event.awayScore.current}
            </span>
          )}
        </div>
      </div>

      {/* Status / time */}
      <div className="flex w-10 flex-shrink-0 flex-col items-center">
        {upcoming ? (
          <span className="text-center font-display text-[11px] font-semibold text-white/50">
            {formatKickoff(event.startTimestamp)}
          </span>
        ) : (
          <span className={`font-display text-[13px] font-semibold ${live ? 'text-green-400' : 'text-white/40'}`}>
            {live ? event.status.description : 'FT'}
          </span>
        )}
        {group && <span className="text-[9px] text-white/25">{group}</span>}
      </div>

      {/* Pool impact */}
      <div className="flex w-[110px] flex-shrink-0 flex-col gap-0.5 border-l border-white/10 pl-3">
        <span className="text-[9px] uppercase tracking-wide text-white/30">Pool impact</span>
        {impacts?.impacts.length ? (
          impacts.impacts.slice(0, 2).map((imp) => (
            <span key={imp.label} className="truncate text-[11px] font-semibold text-[#f0a500]">
              {imp.label} +{imp.points}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-white/30">—</span>
        )}
      </div>
    </div>
  );
}

export function SchedulePage({ todayFixtures, matchImpacts }: Props) {
  const liveFixtures = todayFixtures.filter((f) => f.status.type === 'inprogress');
  const hasLive = liveFixtures.length > 0;
  const [tab, setTab] = useState<'today' | 'live'>(() => (hasLive ? 'live' : 'today'));

  const impactMap = new Map(matchImpacts.map((m) => [m.event.id, m]));
  const shown = tab === 'live' ? liveFixtures : todayFixtures;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg bg-gray-200 p-1 dark:bg-gray-700">
        <button
          onClick={() => setTab('today')}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            tab === 'today'
              ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Today · {todayFixtures.length}
        </button>
        {hasLive && (
          <button
            onClick={() => setTab('live')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              tab === 'live'
                ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live · {liveFixtures.length}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
          No matches today
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1b2a]">
          <div className="flex flex-col">
            {shown.map((event) => (
              <FixtureRow key={event.id} event={event} impacts={impactMap.get(event.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
