import type { MatchImpact } from '../hooks/useLivePoints';

type Props = {
  matchImpacts: MatchImpact[];
  isFetching: boolean;
  lastUpdated?: Date;
};

function statusLabel(desc: string, type: string): string {
  if (type === 'finished') return 'FT';
  // For in-progress matches the server already provides the live minute
  // (e.g. "67'") or "HT" in desc — show it directly instead of generic "LIVE".
  return desc;
}

export function LiveBanner({ matchImpacts, isFetching, lastUpdated }: Props) {
  const sorted = matchImpacts.filter((m) => m.event.status.type === 'inprogress');

  if (!sorted.length) return null;

  const anyLive = true;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1b2a]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/30 px-3 py-2">
        {anyLive ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-green-400">
              Live now
            </span>
          </>
        ) : (
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Latest results
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25">
          {isFetching ? (
            <span className="text-white/40">syncing…</span>
          ) : lastUpdated ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
          <span>· FIFA verified</span>
        </span>
      </div>

      <div className="flex flex-col">
        {sorted.map(({ event, impacts }) => {
          const live = event.status.type === 'inprogress';
          const homeWin = event.homeScore.current > event.awayScore.current;
          const awayWin = event.awayScore.current > event.homeScore.current;
          const group = event.tournament.groupSign
            ? `GRP ${event.tournament.groupSign}`
            : '';

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0"
            >
              {/* Teams + scores */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-gray-100">
                    {event.homeTeam.name}
                  </span>
                  <span
                    className={`font-display text-[17px] font-bold tabular-nums ${
                      homeWin ? 'text-[#f0a500]' : 'text-white'
                    }`}
                  >
                    {event.homeScore.current}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-gray-100">
                    {event.awayTeam.name}
                  </span>
                  <span
                    className={`font-display text-[17px] font-bold tabular-nums ${
                      awayWin ? 'text-[#f0a500]' : 'text-white'
                    }`}
                  >
                    {event.awayScore.current}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex w-9 flex-shrink-0 flex-col items-center">
                <span
                  className={`font-display text-[13px] font-semibold ${
                    live ? 'text-green-400' : 'text-white/40'
                  }`}
                >
                  {statusLabel(event.status.description, event.status.type)}
                </span>
                {group && (
                  <span className="text-[9px] text-white/25">{group}</span>
                )}
              </div>

              {/* Pool impact */}
              <div className="flex w-[120px] flex-shrink-0 flex-col gap-0.5 border-l border-white/10 pl-3">
                <span className="text-[9px] uppercase tracking-wide text-white/30">
                  Pool impact
                </span>
                {impacts.length ? (
                  impacts.slice(0, 2).map((imp) => (
                    <span
                      key={imp.label}
                      className="truncate text-[11px] font-semibold text-[#f0a500]"
                    >
                      {imp.label} +{imp.points}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-white/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
