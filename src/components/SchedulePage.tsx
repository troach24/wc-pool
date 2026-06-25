import { useState, useEffect, useRef } from 'react';
import type { WCEvent } from '../lib/api';
import type { MatchImpact } from '../hooks/useLivePoints';
import type { Entry } from '../lib/types';
import { countryOfFlag, teamKey } from '../lib/teamCountry';

type Props = {
  allFixtures: WCEvent[];
  matchImpacts: MatchImpact[];
  entries: Entry[];
};

function localDateStr(ts: number) {
  return new Date(ts * 1000).toLocaleDateString();
}

function formatKickoff(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function DatePill({
  label,
  sub,
  selected,
  hasLive,
  onClick,
}: {
  label: string;
  sub: string;
  selected: boolean;
  hasLive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-selected={selected}
      className={`relative flex flex-shrink-0 flex-col items-center rounded-xl px-3.5 py-2 transition-colors ${
        selected
          ? 'bg-[#f0a500] text-[#0a1628]'
          : 'bg-white/5 text-white/60 hover:bg-white/10'
      }`}
    >
      {hasLive && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-green-400" />
      )}
      <span className={`text-[11px] font-semibold uppercase tracking-wide ${selected ? 'text-[#0a1628]/70' : 'text-white/40'}`}>
        {label}
      </span>
      <span className={`text-[15px] font-bold leading-tight ${selected ? 'text-[#0a1628]' : 'text-white'}`}>
        {sub}
      </span>
    </button>
  );
}

function picksInFixture(entries: Entry[], event: WCEvent): string[] {
  const homeKey = teamKey(event.homeTeam.name);
  const awayKey = teamKey(event.awayTeam.name);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    for (const pick of [...entry.teams, ...entry.players, ...entry.keepers]) {
      if (seen.has(pick.label)) continue;
      const country = countryOfFlag(pick.label);
      if (country && (country === homeKey || country === awayKey)) {
        seen.add(pick.label);
        result.push(pick.label);
      }
    }
  }
  return result;
}

function FixtureRow({ event, impacts, upcomingPicks }: { event: WCEvent; impacts: MatchImpact | undefined; upcomingPicks?: string[] }) {
  const live = event.status.type === 'inprogress';
  const upcoming = event.status.type === 'notstarted';
  const homeWin = event.homeScore.current > event.awayScore.current;
  const awayWin = event.awayScore.current > event.homeScore.current;
  const group = event.tournament.groupSign ? `GRP ${event.tournament.groupSign}` : event.round;

  return (
    <div className={`flex items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0 ${live ? 'bg-green-500/5' : ''}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-gray-100">{event.homeTeam.name}</span>
          {!upcoming && (
            <span className={`font-display text-[17px] font-bold tabular-nums ${homeWin ? 'text-[#f0a500]' : 'text-white'}`}>
              {event.homeScore.current}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-gray-100">{event.awayTeam.name}</span>
          {!upcoming && (
            <span className={`font-display text-[17px] font-bold tabular-nums ${awayWin ? 'text-[#f0a500]' : 'text-white'}`}>
              {event.awayScore.current}
            </span>
          )}
        </div>
      </div>

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

      <div className="flex w-[110px] flex-shrink-0 flex-col gap-0.5 border-l border-white/10 pl-3">
        <span className="text-[9px] uppercase tracking-wide text-white/30">
          {upcoming && upcomingPicks?.length ? 'Pool picks' : 'Pool impact'}
        </span>
        {impacts?.impacts.length ? (
          impacts.impacts.slice(0, 2).map((imp) => (
            <span key={imp.label} className="truncate text-[11px] font-semibold text-[#f0a500]">
              {imp.label} +{imp.points}
            </span>
          ))
        ) : upcomingPicks?.length ? (
          upcomingPicks.slice(0, 3).map((label) => (
            <span key={label} className="truncate text-[11px] text-white/50">{label}</span>
          ))
        ) : (
          <span className="text-[11px] text-white/30">—</span>
        )}
      </div>
    </div>
  );
}

export function SchedulePage({ allFixtures, matchImpacts, entries }: Props) {
  const localToday = new Date().toLocaleDateString();
  const stripRef = useRef<HTMLDivElement>(null);

  // Build unique sorted dates
  const dates = [...new Set(allFixtures.map((f) => localDateStr(f.startTimestamp)))];

  const todayOrFirst = dates.includes(localToday) ? localToday : dates[0] ?? localToday;
  const [selectedDate, setSelectedDate] = useState(todayOrFirst);

  const liveByDate = new Map<string, number>();
  for (const f of allFixtures) {
    if (f.status.type === 'inprogress') {
      const d = localDateStr(f.startTimestamp);
      liveByDate.set(d, (liveByDate.get(d) ?? 0) + 1);
    }
  }

  const impactMap = new Map(matchImpacts.map((m) => [m.event.id, m]));
  const shown = allFixtures.filter((f) => localDateStr(f.startTimestamp) === selectedDate);

  // Scroll selected pill into center on mount and on change
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const pill = strip.querySelector<HTMLButtonElement>('[data-selected="true"]');
    if (pill) {
      pill.scrollIntoView({ inline: 'center', behavior: selectedDate === todayOrFirst ? 'instant' : 'smooth', block: 'nearest' });
    }
  }, [selectedDate]);

  function pillLabel(dateStr: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === localToday) return 'Today';
    if (dateStr === tomorrow.toLocaleDateString()) return 'Tomorrow';
    if (dateStr === yesterday.toLocaleDateString()) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short' });
  }

  function pillSub(dateStr: string) {
    const d = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === localToday || dateStr === tomorrow.toLocaleDateString() || dateStr === yesterday.toLocaleDateString()) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div className="mx-auto max-w-3xl py-4">
      {/* Date strip */}
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {dates.map((dateStr) => (
          <DatePill
            key={dateStr}
            label={pillLabel(dateStr)}
            sub={pillSub(dateStr)}
            selected={selectedDate === dateStr}
            hasLive={(liveByDate.get(dateStr) ?? 0) > 0}
            onClick={() => setSelectedDate(dateStr)}
          />
        ))}
      </div>

      {/* Fixtures for selected date */}
      <div className="px-4">
        {shown.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            No matches
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1b2a]">
            {shown.map((event) => (
              <FixtureRow
                key={event.id}
                event={event}
                impacts={impactMap.get(event.id)}
                upcomingPicks={event.status.type === 'notstarted' ? picksInFixture(entries, event) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
