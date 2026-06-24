import type { WCEvent } from '../lib/api';

type Props = { liveMatches?: WCEvent[] };

export function Header({ liveMatches = [] }: Props) {
  return (
    <header className="bg-gradient-to-r from-[#1a3a6b] to-[#c8102e] text-white px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚽</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">World Cup 2026 Pool Standings</h1>
            <p className="text-xs opacity-80 mt-0.5">Blaze-Heuga Pool · 20 entries · tap for full breakdown</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="bg-white/15 rounded-full px-3 py-1 text-xs">
            💰 Pot $1,500 · 1st $1,000 · 2nd $350 · 3rd $150
          </span>
          {liveMatches.map((m) => (
            <span key={m.id} className="bg-red-500/80 rounded-full px-3 py-1 text-xs font-semibold animate-pulse">
              🔴 LIVE: {m.homeTeam.name} {m.homeScore.current}–{m.awayScore.current} {m.awayTeam.name}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
