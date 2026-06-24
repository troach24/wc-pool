import { useQuery } from '@tanstack/react-query';
import {
  fetchWCStandings,
  fetchWCFixtures,
  fetchFixtureEvents,
  groupLetterMap,
  type WCEvent,
  type Incident,
} from '../lib/api';
import {
  accumulateIncidents,
  computePlayerPoints,
  computeTeamPointsFromStats,
  computeMatchImpacts,
  applyGroupBonuses,
  findMatchingApiName,
  type PickImpact,
} from '../lib/pointCalc';
import type { Entry } from '../lib/types';

// Finished fixtures' events never change — cache them for the session so the
// live refresh loop only re-fetches in-progress matches.
const finishedEventCache = new Map<number, Incident[]>();

async function eventsFor(event: WCEvent): Promise<Incident[]> {
  if (event.status.type === 'finished' && finishedEventCache.has(event.id)) {
    return finishedEventCache.get(event.id)!;
  }
  const incidents = await fetchFixtureEvents(event.id);
  if (event.status.type === 'finished') finishedEventCache.set(event.id, incidents);
  return incidents;
}

async function fetchAllData() {
  const standings = await fetchWCStandings();
  const fixtures = await fetchWCFixtures(groupLetterMap(standings));

  const played = fixtures.filter(
    (m) => m.status.type === 'finished' || m.status.type === 'inprogress'
  );

  const incidentResults = await Promise.all(
    played.map(async (event) => ({ event, incidents: await eventsFor(event) }))
  );

  return { fixtures, incidentResults, standings };
}

export type MatchImpact = {
  event: WCEvent;
  impacts: PickImpact[];
};

export type LivePointsResult = {
  updatedPoints: Map<string, number>;
  pickDeltas: Map<string, number>;
  lastUpdated: Date;
  liveMatches: WCEvent[];
  matchImpacts: MatchImpact[];
};

export function useLivePoints(entries: Entry[]) {
  return useQuery({
    queryKey: ['live-points'],
    queryFn: async (): Promise<LivePointsResult> => {
      const { fixtures, incidentResults, standings } = await fetchAllData();

      const poolLabels = new Set<string>();
      for (const entry of entries) {
        for (const p of [...entry.teams, ...entry.players, ...entry.keepers]) {
          poolLabels.add(p.label);
        }
      }

      // Aggregate stats across all played matches
      const liveStats = accumulateIncidents(incidentResults);

      const teamPointsToday = new Map<string, number>();
      for (const [teamName, stats] of liveStats.teams) {
        teamPointsToday.set(teamName, computeTeamPointsFromStats(stats));
      }
      const teamPointsWithBonuses = applyGroupBonuses(teamPointsToday, standings);

      // Per-pick deltas for the leaderboard
      const pickDeltas = new Map<string, number>();
      for (const label of poolLabels) {
        const playerMatch = findMatchingApiName(label, liveStats.players.keys());
        if (playerMatch) {
          const pts = computePlayerPoints(liveStats.players.get(playerMatch)!);
          if (pts > 0) pickDeltas.set(label, pts);
          continue;
        }
        const teamMatch = findMatchingApiName(label, teamPointsWithBonuses.keys());
        if (teamMatch) {
          const pts = teamPointsWithBonuses.get(teamMatch) ?? 0;
          if (pts > 0) pickDeltas.set(label, pts);
        }
      }

      // Per-match impacts (all played matches)
      const allImpacts: MatchImpact[] = incidentResults.map(({ event, incidents }) => {
        const matchStats = accumulateIncidents([{ event, incidents }]);
        const matchTeamPoints = new Map<string, number>();
        for (const [teamName, stats] of matchStats.teams) {
          matchTeamPoints.set(teamName, computeTeamPointsFromStats(stats));
        }
        return {
          event,
          impacts: computeMatchImpacts(matchStats, matchTeamPoints, poolLabels),
        };
      });

      // Banner shows: live matches + finished matches from the most recent match day
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

      // Updated entry totals
      const updatedPoints = new Map<string, number>();
      for (const entry of entries) {
        const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
        const todayExtra = allPicks.reduce(
          (sum, pick) => sum + (pickDeltas.get(pick.label) ?? 0),
          0
        );
        updatedPoints.set(entry.name, entry.points + todayExtra);
      }

      const liveMatches = fixtures.filter((m) => m.status.type === 'inprogress');

      return {
        updatedPoints,
        pickDeltas,
        lastUpdated: new Date(),
        liveMatches,
        matchImpacts,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 90_000,
  });
}
