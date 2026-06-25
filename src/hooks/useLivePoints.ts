import { useQuery } from '@tanstack/react-query';
import type { WCEvent } from '../lib/api';
import type { PickImpact } from '../lib/pointCalc';
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
  allFixtures: WCEvent[];
  matchImpacts: MatchImpact[];
  lastUpdated: Date;
  goalSeq: number;
  goalTeam?: string;
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
        allFixtures: p.allFixtures,
        matchImpacts: p.matchImpacts,
        lastUpdated: new Date(p.lastUpdated),
        goalSeq: p.goalSeq,
        goalTeam: p.goalTeam,
      };
    },
    staleTime: 30_000,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 300_000;
      if (data.liveMatchCount > 0) return 45_000;
      // Poll every 60s if a game kicks off within the next 10 minutes.
      const soon = data.allFixtures.some((f) => {
        const msUntil = f.startTimestamp * 1000 - Date.now();
        return msUntil > 0 && msUntil < 10 * 60 * 1000;
      });
      return soon ? 60_000 : 300_000;
    },
  });
}
