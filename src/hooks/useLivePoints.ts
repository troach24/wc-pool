import { useQuery } from '@tanstack/react-query';
import {
  fetchWCStandings,
  fetchWCFixtures,
  fetchFixturePlayers,
  groupLetterMap,
  type WCEvent,
  type PlayerLine,
} from '../lib/api';
import {
  accumulateLines,
  computePlayerPoints,
  computeKeeperPoints,
  computeTeamPointsFromStats,
  computeMatchImpacts,
  applyGroupBonuses,
  findMatchingApiName,
  type PickImpact,
} from '../lib/pointCalc';
import type { Entry } from '../lib/types';

// Finished fixtures' stats never change — cache them for the session so the
// live refresh loop only re-fetches in-progress matches.
const finishedLineCache = new Map<number, PlayerLine[]>();

async function linesFor(event: WCEvent): Promise<PlayerLine[]> {
  if (event.status.type === 'finished' && finishedLineCache.has(event.id)) {
    return finishedLineCache.get(event.id)!;
  }
  const lines = await fetchFixturePlayers(event.id);
  if (event.status.type === 'finished') finishedLineCache.set(event.id, lines);
  return lines;
}

async function fetchAllData() {
  const standings = await fetchWCStandings();
  const fixtures = await fetchWCFixtures(groupLetterMap(standings));

  const played = fixtures.filter(
    (m) => m.status.type === 'finished' || m.status.type === 'inprogress'
  );

  const lineResults = await Promise.all(
    played.map(async (event) => ({ event, lines: await linesFor(event) }))
  );

  return { fixtures, lineResults, standings };
}

export type MatchImpact = {
  event: WCEvent;
  impacts: PickImpact[];
};

export type LivePointsResult = {
  updatedPoints: Map<string, number>; // entry name → live total
  pickValues: Map<string, number>; // pick label → live value (API source of truth)
  lastUpdated: Date;
  liveMatches: WCEvent[];
  matchImpacts: MatchImpact[];
};

export function useLivePoints(entries: Entry[]) {
  return useQuery({
    queryKey: ['live-points'],
    queryFn: async (): Promise<LivePointsResult> => {
      const { fixtures, lineResults, standings } = await fetchAllData();

      // Pool pick labels split by category — keeper picks score differently.
      const teamLabels = new Set<string>();
      const playerLabels = new Set<string>();
      const keeperLabels = new Set<string>();
      for (const entry of entries) {
        for (const p of entry.teams) teamLabels.add(p.label);
        for (const p of entry.players) playerLabels.add(p.label);
        for (const p of entry.keepers) keeperLabels.add(p.label);
      }
      const allLabels = new Set([...teamLabels, ...playerLabels, ...keeperLabels]);

      // Aggregate stats across all played matches
      const stats = accumulateLines(lineResults);

      const teamPointsRaw = new Map<string, number>();
      for (const [teamName, ts] of stats.teams) {
        teamPointsRaw.set(teamName, computeTeamPointsFromStats(ts));
      }
      const teamPoints = applyGroupBonuses(teamPointsRaw, standings);

      // Absolute live value per pick, category-aware. The API is the source of
      // truth; a pick only gets a live value when its name matches the feed.
      // Unmatched picks fall back to their seed value in the components.
      const pickValues = new Map<string, number>();
      for (const label of teamLabels) {
        const m = findMatchingApiName(label, teamPoints.keys());
        if (m) pickValues.set(label, teamPoints.get(m) ?? 0);
      }
      for (const label of playerLabels) {
        const m = findMatchingApiName(label, stats.players.keys());
        if (m) pickValues.set(label, computePlayerPoints(stats.players.get(m)!));
      }
      for (const label of keeperLabels) {
        const m = findMatchingApiName(label, stats.keepers.keys());
        if (m) pickValues.set(label, computeKeeperPoints(stats.keepers.get(m)!));
      }

      // Per-match impacts for the live banner
      const allImpacts: MatchImpact[] = lineResults.map(({ event, lines }) => {
        const ms = accumulateLines([{ event, lines }]);
        const mTeamPoints = new Map<string, number>();
        for (const [teamName, ts] of ms.teams) {
          mTeamPoints.set(teamName, computeTeamPointsFromStats(ts));
        }
        return { event, impacts: computeMatchImpacts(ms, mTeamPoints, allLabels) };
      });

      // Banner shows live + finished from the most recent match day
      const dayKey = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);
      const finishedDays = allImpacts
        .filter((m) => m.event.status.type === 'finished')
        .map((m) => dayKey(m.event.startTimestamp))
        .sort();
      const latestDay = finishedDays[finishedDays.length - 1];
      const matchImpacts = allImpacts.filter(
        (m) =>
          m.event.status.type === 'inprogress' ||
          dayKey(m.event.startTimestamp) === latestDay
      );

      // Entry total = sum of live pick values, falling back to seed per pick.
      const updatedPoints = new Map<string, number>();
      for (const entry of entries) {
        const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
        const total = allPicks.reduce(
          (sum, pick) => sum + (pickValues.get(pick.label) ?? pick.points),
          0
        );
        updatedPoints.set(entry.name, total);
      }

      return {
        updatedPoints,
        pickValues,
        lastUpdated: new Date(),
        liveMatches: fixtures.filter((m) => m.status.type === 'inprogress'),
        matchImpacts,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 90_000,
  });
}
