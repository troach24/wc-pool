import type { Entry } from '../lib/types';
import type { LivePointsResult } from '../hooks/useLivePoints';
import { EntryCard } from './EntryCard';

type Props = {
  entries: Entry[];
  livePoints?: LivePointsResult;
};

export function Leaderboard({ entries, livePoints }: Props) {
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
    <div className="flex flex-col gap-2">
      {ranked.map(({ entry, rank }) => (
        <EntryCard
          key={entry.name}
          entry={entry}
          rank={rank}
          liveTotal={livePoints?.updatedPoints.get(entry.name)}
          pickValues={livePoints?.pickValues}
        />
      ))}
    </div>
  );
}
