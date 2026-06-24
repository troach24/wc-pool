import type { Entry } from '../lib/types';
import type { LivePointsResult } from '../hooks/useLivePoints';

const MEDALS = ['🥇', '🥈', '🥉'];

const GROUP_COLORS = [
  'bg-blue-700',
  'bg-teal-600',
  'bg-red-700',
];

type Props = {
  entries: Entry[];
  livePoints: LivePointsResult;
};

export function StandingsGrid({ entries, livePoints }: Props) {
  const total = (name: string) => livePoints.updatedPoints.get(name) ?? 0;
  const sorted = [...entries].sort((a, b) => total(b.name) - total(a.name));

  const ranked: { entry: Entry; rank: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = total(sorted[i].name);
    const prev = i > 0 ? total(sorted[i - 1].name) : null;
    const rank = i === 0 ? 1 : prev === cur ? ranked[i - 1].rank : i + 1;
    ranked.push({ entry: sorted[i], rank });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="w-full text-xs whitespace-nowrap border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-gray-800 text-white px-2 py-2 text-center w-10">#</th>
            <th className="sticky left-10 z-20 bg-gray-800 text-white px-3 py-2 text-left min-w-[120px] sm:min-w-[180px]">Team Name</th>
            {['Team 1', 'Team 2', 'Team 3'].map((h, i) => (
              <th key={h} className={`${GROUP_COLORS[i]} text-white px-3 py-2 text-left uppercase tracking-wide min-w-[130px]`}>{h}</th>
            ))}
            {['Player 1', 'Player 2', 'Player 3'].map((h, i) => (
              <th key={h} className={`${GROUP_COLORS[i]} text-white px-3 py-2 text-left uppercase tracking-wide min-w-[130px]`}>{h}</th>
            ))}
            {['Keeper 1', 'Keeper 2', 'Keeper 3'].map((h, i) => (
              <th key={h} className={`${GROUP_COLORS[i]} text-white px-3 py-2 text-left uppercase tracking-wide min-w-[130px]`}>{h}</th>
            ))}
            <th className="bg-yellow-700 text-white px-3 py-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map(({ entry, rank }) => {
            const entryTotal = total(entry.name);
            const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
            const borderClass = rank === 1 ? 'border-l-4 border-l-yellow-400' :
              rank === 2 ? 'border-l-4 border-l-gray-400' :
              rank === 3 ? 'border-l-4 border-l-amber-600' : '';

            return (
              <tr
                key={entry.name}
                className="group hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {/* Rank */}
                <td className={`sticky left-0 z-10 bg-white dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 px-2 py-2 font-black text-center text-gray-500 dark:text-gray-400 w-10 ${borderClass}`}>
                  {rank <= 3 ? MEDALS[rank - 1] : rank}
                </td>
                {/* Name */}
                <td className="sticky left-10 z-10 bg-white dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 px-3 py-2 font-semibold text-gray-800 dark:text-gray-100 min-w-[120px] sm:min-w-[180px] max-w-[120px] sm:max-w-none overflow-hidden">
                  <span className="block truncate sm:overflow-visible sm:whitespace-normal">{entry.name}</span>
                </td>
                {/* Picks */}
                {allPicks.map((pick, i) => {
                  const value = livePoints.pickValues.get(pick.label) ?? 0;
                  const live = livePoints.livePickLabels.has(pick.label);
                  return (
                    <td key={i} className="px-3 py-2 border-l border-gray-100 dark:border-gray-700">
                      <div className="text-gray-700 dark:text-gray-300">{pick.label}</div>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold ${value === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-blue-600 dark:text-blue-400'}`}>
                          +{value}
                        </span>
                        {live && (
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" title="scoring live" />
                        )}
                      </div>
                    </td>
                  );
                })}
                {/* Total */}
                <td className="px-3 py-2 text-center font-black text-base text-[#1a3a6b] dark:text-blue-300 bg-yellow-50 dark:bg-yellow-900/10">
                  {entryTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
