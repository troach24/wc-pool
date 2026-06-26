import { useQuery } from '@tanstack/react-query';
import type { WCEvent } from '../lib/api';
import type { PickImpact } from '../lib/pointCalc';
import type { StandingsPayload } from '../lib/computeStandings';

// Client-side goal detection: diff scores between fetches so cold-start
// serverless resets don't swallow goals.
let clientPrevScores: Map<number, { h: number; a: number }> | null = null;
let clientGoalSeq = 0;
let clientGoalTeam: string | undefined;

function detectGoals(fixtures: WCEvent[]): { goalSeq: number; goalTeam?: string } {
  const cur = new Map<number, { h: number; a: number }>();
  for (const f of fixtures) {
    if (f.status.type === 'inprogress' || f.status.type === 'finished') {
      cur.set(f.id, { h: f.homeScore.current, a: f.awayScore.current });
    }
  }
  if (clientPrevScores) {
    for (const f of fixtures) {
      const before = clientPrevScores.get(f.id);
      const now = cur.get(f.id);
      if (!before || !now) continue;
      if (now.h > before.h) { clientGoalSeq++; clientGoalTeam = f.homeTeam.name; }
      else if (now.a > before.a) { clientGoalSeq++; clientGoalTeam = f.awayTeam.name; }
    }
  }
  clientPrevScores = cur;
  return { goalSeq: clientGoalSeq, goalTeam: clientGoalTeam };
}

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
  allMatchImpacts: MatchImpact[];
  pickToTeam: Map<string, string>;
  pickGroupBonus: Map<string, number>;
  pickExcludedFixtures: Map<string, number[]>;
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
      const { goalSeq, goalTeam } = detectGoals(p.allFixtures);
      return {
        updatedPoints: new Map(p.updatedPoints),
        pickValues: new Map(p.pickValues),
        livePickLabels: new Set(p.livePickLabels),
        liveMatchCount: p.liveMatchCount,
        todayMatchCount: p.todayMatchCount,
        allFixtures: p.allFixtures,
        matchImpacts: p.matchImpacts,
        allMatchImpacts: p.allMatchImpacts,
        pickToTeam: new Map(p.pickToTeam),
        pickGroupBonus: new Map(p.pickGroupBonus),
        pickExcludedFixtures: new Map(p.pickExcludedFixtures),
        lastUpdated: new Date(p.lastUpdated),
        goalSeq,
        goalTeam,
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
