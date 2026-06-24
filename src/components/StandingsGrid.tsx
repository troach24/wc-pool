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
  livePoints?: LivePointsResult;
};

export function StandingsGrid({ entries, livePoints }: Props) {
  const sorted = [...entries].sort((a, b) => {
    const aTotal = livePoints?.updatedPoints.get(a.name) ?? a.points;
    const bTotal = livePoints?.updatedPoints.get(b.name) ?? b.points;
    return bTotal - aTotal;
  });

  const ranked: { entry: Entry; rank: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const aTotal = livePoints?.updatedPoints.get(sorted[i].name) ?? sorted[i].points;
    const prevTotal = i > 0
      ? (livePoints?.updatedPoints.get(sorted[i - 1].name) ?? sorted[i - 1].points)
      : null;
    const rank = i === 0 ? 1 : prevTotal === aTotal ? ranked[i - 1].rank : i + 1;
    ranked.push({ entry: sorted[i], rank });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <table className="w-full text-xs whitespace-nowrap border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-gray-800 text-white px-2 py-2 text-center w-10">#</th>
            <th className="sticky left-10 z-20 bg-gray-800 text-white px-3 py-2 text-left min-w-[180px]">Team Name</th>
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
            const total = livePoints?.updatedPoints.get(entry.name) ?? entry.points;
            const delta = livePoints ? total - entry.points : 0;
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
                <td className="sticky left-10 z-10 bg-white dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 px-3 py-2 font-semibold text-gray-800 dark:text-gray-100 min-w-[180px]">
                  {entry.name}
                </td>
                {/* Picks */}
                {allPicks.map((pick, i) => {
                  const pickDelta = livePoints?.pickDeltas.get(pick.label) ?? 0;
                  return (
                    <td key={i} className="px-3 py-2 border-l border-gray-100 dark:border-gray-700">
                      <div className="text-gray-700 dark:text-gray-300">{pick.label}</div>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold ${pick.points === 0 && !pickDelta ? 'text-gray-300 dark:text-gray-600' : 'text-blue-600 dark:text-blue-400'}`}>
                          +{pick.points + pickDelta}
                        </span>
                        {pickDelta > 0 && (
                          <span className="text-green-500 text-[10px] font-bold">▲{pickDelta}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                {/* Total */}
                <td className="px-3 py-2 text-center font-black text-base text-[#1a3a6b] dark:text-blue-300 bg-yellow-50 dark:bg-yellow-900/10">
                  {total}
                  {delta > 0 && (
                    <div className="text-[10px] font-bold text-green-500">+{delta}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
