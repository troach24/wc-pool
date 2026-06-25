import { useQuery } from '@tanstack/react-query';
import type { WCEvent } from '../lib/api';
import type { PickImpact } from '../lib/pointCalc';
import type { WCEvent } from '../lib/api';
import type { StandingsPayload } from '../lib/computeStandings';

export type MatchImpact = {
  event: WCEvent;
  impacts: PickImpact[];
};

export type LivePointsResult = {
  updatedPoints: Map<string, number>;
  pickValues: Map<string, number>;
  livePickLabels: Set<string>;
  liveMatchCount: number;
  todayMatchCount: number;
  todayFixtures: WCEvent[];
  matchImpacts: MatchImpact[];
  lastUpdated: Date;
  recentGoal?: { team: string; at: number };
};

// The client makes ONE request to our own cached endpoint — no direct calls to
// API-Football. The serverless function computes once and the edge cache serves
// every visitor, so upstream usage no longer scales with the number of viewers.
export function useLivePoints() {
  return useQuery({
    queryKey: ['live-points'],
    queryFn: async (): Promise<LivePointsResult> => {
      const res = await fetch('/api/standings');
      if (!res.ok) throw new Error(`standings ${res.status}`);
      const p: StandingsPayload = await res.json();
      return {
        updatedPoints: new Map(p.updatedPoints),
        pickValues: new Map(p.pickValues),
        livePickLabels: new Set(p.livePickLabels),
        liveMatchCount: p.liveMatchCount,
        todayMatchCount: p.todayMatchCount,
        todayFixtures: p.todayFixtures,
        matchImpacts: p.matchImpacts,
        lastUpdated: new Date(p.lastUpdated),
        recentGoal: p.recentGoal,
      };
    },
    staleTime: 30_000,
    refetchIntervalInBackground: false,
    refetchInterval: (query) =>
      (query.state.data?.liveMatchCount ?? 0) > 0 ? 45_000 : 300_000,
  });
}
