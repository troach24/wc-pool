import { useQuery } from '@tanstack/react-query';
import {
  fetchMatchesForDate,
  fetchMatchIncidents,
  fetchGroupStandings,
  type WCEvent,
} from '../lib/api';
import {
  accumulateIncidents,
  computePlayerPoints,
  computeTeamPointsFromStats,
  applyGroupBonuses,
  findMatchingApiName,
} from '../lib/pointCalc';
import type { Entry } from '../lib/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchAllTodayData() {
  const matches = await fetchMatchesForDate(todayStr());
  const finished = matches.filter(
    (m) => m.status.type === 'finished' || m.status.type === 'inprogress'
  );

  const incidentResults = await Promise.all(
    finished.map(async (event) => {
      const incidents = await fetchMatchIncidents(event.id);
      return { event, incidents };
    })
  );

  const standings = await fetchGroupStandings();

  return { matches, incidentResults, standings };
}

export type LivePointsResult = {
  // Map of entry name → updated total points for today
  updatedPoints: Map<string, number>;
  // Map of pick label → today's earned points (for display)
  pickDeltas: Map<string, number>;
  lastUpdated: Date;
  liveMatches: WCEvent[];
};

export function useLivePoints(entries: Entry[]) {
  return useQuery({
    queryKey: ['live-points', todayStr()],
    queryFn: async (): Promise<LivePointsResult> => {
      const { matches, incidentResults, standings } = await fetchAllTodayData();

      const liveStats = accumulateIncidents(incidentResults);

      // Build raw team point totals from today's games only
      const teamPointsToday = new Map<string, number>();
      for (const [teamName, stats] of liveStats.teams) {
        teamPointsToday.set(teamName, computeTeamPointsFromStats(stats));
      }

      // Apply group bonuses (position 1/2/3 after 3 games)
      const teamPointsWithBonuses = applyGroupBonuses(teamPointsToday, standings);

      // Compute today's delta for each pool pick
      const pickDeltas = new Map<string, number>();

      for (const entry of entries) {
        const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];

        for (const pick of allPicks) {
          // Try to match against player stats
          const playerMatch = findMatchingApiName(pick.label, liveStats.players.keys());
          if (playerMatch) {
            const stats = liveStats.players.get(playerMatch)!;
            const pts = computePlayerPoints(stats);
            if (pts > 0) pickDeltas.set(pick.label, pts);
            continue;
          }

          // Try to match against team stats
          const teamMatch = findMatchingApiName(pick.label, teamPointsWithBonuses.keys());
          if (teamMatch) {
            const pts = teamPointsWithBonuses.get(teamMatch) ?? 0;
            if (pts > 0) pickDeltas.set(pick.label, pts);
          }
        }
      }

      // Compute updated totals per entry
      const updatedPoints = new Map<string, number>();
      for (const entry of entries) {
        const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
        const todayExtra = allPicks.reduce((sum, pick) => {
          return sum + (pickDeltas.get(pick.label) ?? 0);
        }, 0);
        updatedPoints.set(entry.name, entry.points + todayExtra);
      }

      return {
        updatedPoints,
        pickDeltas,
        lastUpdated: new Date(),
        liveMatches: matches.filter((m) => m.status.type === 'inprogress'),
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 90_000,
  });
}
