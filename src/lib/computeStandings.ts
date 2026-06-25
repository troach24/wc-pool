// Server-side orchestration: fetch from API-Football + compute the full
// standings payload. Runs inside the /api/standings serverless function so the
// work (and the API key) is shared across all visitors via the edge cache.
import {
  fetchWCStandings,
  fetchWCFixtures,
  fetchFixturePlayers,
  groupLetterMap,
  type WCEvent,
  type PlayerLine,
} from './api';
import {
  accumulateLines,
  computePlayerPoints,
  computeKeeperPoints,
  computeTeamPointsFromStats,
  computeMatchImpacts,
  applyGroupBonuses,
  findPlayerByCountry,
  findTeamByCountry,
  type PickImpact,
} from './pointCalc';
import type { Entry } from './types';

// Finished fixtures are immutable — cache their lines for the lifetime of the
// warm serverless instance so each recompute only re-fetches live matches.
const finishedLineCache = new Map<number, PlayerLine[]>();

// Run async tasks with a max concurrency, preserving input order.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function linesFor(event: WCEvent): Promise<PlayerLine[]> {
  if (event.status.type === 'finished' && finishedLineCache.has(event.id)) {
    return finishedLineCache.get(event.id)!;
  }
  const lines = await fetchFixturePlayers(event.id);
  if (event.status.type === 'finished') finishedLineCache.set(event.id, lines);
  return lines;
}

export type StandingsPayload = {
  updatedPoints: [string, number][];
  pickValues: [string, number][];
  livePickLabels: string[];
  liveMatchCount: number;
  matchImpacts: { event: WCEvent; impacts: PickImpact[] }[];
  lastUpdated: string;
  // The scoring team of the most recent goal, kept for ~10 min so freshly
  // loaded clients can still celebrate it. Detected from score deltas between
  // server recomputes — no extra API calls.
  recentGoal?: { team: string; at: number };
};

// Module-scoped across warm serverless invocations.
const GOAL_WINDOW_MS = 10 * 60 * 1000;
let prevScores: Map<number, { h: number; a: number }> | null = null;
let recentGoal: { team: string; at: number } | null = null;

export async function computeStandings(entries: Entry[]): Promise<StandingsPayload> {
  const standings = await fetchWCStandings();
  const fixtures = await fetchWCFixtures(groupLetterMap(standings));

  const played = fixtures.filter(
    (m) => m.status.type === 'finished' || m.status.type === 'inprogress'
  );

  // Detect a fresh goal from score deltas vs the previous recompute.
  const curScores = new Map<number, { h: number; a: number }>();
  for (const e of played) {
    curScores.set(e.id, { h: e.homeScore.current, a: e.awayScore.current });
  }
  if (prevScores) {
    for (const e of played) {
      const before = prevScores.get(e.id);
      const now = curScores.get(e.id)!;
      if (!before) continue;
      if (now.h > before.h) recentGoal = { team: e.homeTeam.name, at: Date.now() };
      else if (now.a > before.a) recentGoal = { team: e.awayTeam.name, at: Date.now() };
    }
  }
  prevScores = curScores;

  // Throttle to avoid bursting past the per-minute rate limit on a cold start.
  // (Most calls are served from finishedLineCache on warm instances anyway.)
  const lineResults = await mapWithConcurrency(played, 5, async (event) => ({
    event,
    lines: await linesFor(event),
  }));

  const teamLabels = new Set<string>();
  const playerLabels = new Set<string>();
  const keeperLabels = new Set<string>();
  for (const entry of entries) {
    for (const p of entry.teams) teamLabels.add(p.label);
    for (const p of entry.players) playerLabels.add(p.label);
    for (const p of entry.keepers) keeperLabels.add(p.label);
  }
  const allLabels = new Set([...teamLabels, ...playerLabels, ...keeperLabels]);

  const stats = accumulateLines(lineResults);

  const teamPointsRaw = new Map<string, number>();
  for (const [teamName, ts] of stats.teams) {
    teamPointsRaw.set(teamName, computeTeamPointsFromStats(ts));
  }
  const teamPoints = applyGroupBonuses(teamPointsRaw, standings);

  const teamOf = (n: string) => stats.playerTeam.get(n);
  const pickValues = new Map<string, number>();
  for (const label of teamLabels) {
    const m = findTeamByCountry(label, teamPoints.keys());
    if (m) pickValues.set(label, teamPoints.get(m) ?? 0);
  }
  for (const label of playerLabels) {
    const m = findPlayerByCountry(label, stats.players.keys(), teamOf);
    if (m) pickValues.set(label, computePlayerPoints(stats.players.get(m)!));
  }
  for (const label of keeperLabels) {
    const m = findPlayerByCountry(label, stats.keepers.keys(), teamOf);
    if (m) pickValues.set(label, computeKeeperPoints(stats.keepers.get(m)!));
  }

  const allImpacts = lineResults.map(({ event, lines }) => {
    const ms = accumulateLines([{ event, lines }]);
    const mTeamPoints = new Map<string, number>();
    for (const [teamName, ts] of ms.teams) {
      mTeamPoints.set(teamName, computeTeamPointsFromStats(ts));
    }
    return { event, impacts: computeMatchImpacts(ms, mTeamPoints, allLabels) };
  });

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

  const updatedPoints = new Map<string, number>();
  for (const entry of entries) {
    const allPicks = [...entry.teams, ...entry.players, ...entry.keepers];
    const total = allPicks.reduce((sum, pick) => sum + (pickValues.get(pick.label) ?? 0), 0);
    updatedPoints.set(entry.name, total);
  }

  const livePickLabels = new Set<string>();
  for (const mi of matchImpacts) {
    if (mi.event.status.type === 'inprogress') {
      for (const imp of mi.impacts) livePickLabels.add(imp.label);
    }
  }

  const freshGoal =
    recentGoal && Date.now() - recentGoal.at < GOAL_WINDOW_MS ? recentGoal : undefined;

  return {
    updatedPoints: [...updatedPoints],
    pickValues: [...pickValues],
    livePickLabels: [...livePickLabels],
    liveMatchCount: fixtures.filter((m) => m.status.type === 'inprogress').length,
    matchImpacts,
    lastUpdated: new Date().toISOString(),
    recentGoal: freshGoal,
  };
}
