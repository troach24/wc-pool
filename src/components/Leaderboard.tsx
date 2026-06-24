import type { Entry } from '../lib/types';
import type { LivePointsResult } from '../hooks/useLivePoints';
import { EntryCard } from './EntryCard';

type Props = {
  entries: Entry[];
  livePoints: LivePointsResult;
};

export function Leaderboard({ entries, livePoints }: Props) {
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
    <div className="flex flex-col gap-2">
      {ranked.map(({ entry, rank }) => (
        <EntryCard
          key={entry.name}
          entry={entry}
          rank={rank}
          total={total(entry.name)}
          pickValues={livePoints.pickValues}
          livePickLabels={livePoints.livePickLabels}
        />
      ))}
    </div>
  );
}
