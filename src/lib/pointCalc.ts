import type { PlayerLine, StandingRow, WCEvent } from './api';

// FIFA points (W=3, D=1) for a standings row — used to assess group security.
function fifaPts(row: StandingRow): number {
  return row.wins * 3 + row.draws;
}

// Max FIFA points a team can reach (assuming they win every remaining game).
function maxFifaPts(row: StandingRow): number {
  return fifaPts(row) + (3 - row.matches) * 3;
}

// Result of the finished H2H group fixture between two teams (group stage only).
// Returns 'win' if teamId beat opponentId, 'loss', 'draw', or 'not_played'.
function h2hResult(
  teamId: number,
  opponentId: number,
  fixtures: WCEvent[]
): 'win' | 'loss' | 'draw' | 'not_played' {
  const f = fixtures.find(
    (x) =>
      x.status.type === 'finished' &&
      x.round.toLowerCase().includes('group') &&
      ((x.homeTeam.id === teamId && x.awayTeam.id === opponentId) ||
        (x.homeTeam.id === opponentId && x.awayTeam.id === teamId))
  );
  if (!f) return 'not_played';
  const h = f.homeScore.current;
  const a = f.awayScore.current;
  if (h === a) return 'draw';
  const isHome = f.homeTeam.id === teamId;
  return (isHome ? h > a : a > h) ? 'win' : 'loss';
}

// Whether a team's group position (1, 2, or 3) is mathematically secured.
// A position P is secured when at most (P-1) other teams in the group can
// possibly finish ranked above this team, accounting for:
//   1. Points: can another team exceed this team's current FIFA points?
//   2. Head-to-head (2026 WC tiebreaker): for teams that can only tie on points,
//      did this team beat them? If yes, they lose the H2H tiebreaker.
// Ignores overall GD tiebreaker (only falls back to H2H for pure-points ties).
function isPositionSecured(
  row: StandingRow,
  groupRows: StandingRow[],
  fixtures: WCEvent[],
  targetPosition: number
): boolean {
  const myPts = fifaPts(row);
  const others = groupRows.filter((r) => r.team.id !== row.team.id);

  let canRankAbove = 0;
  for (const other of others) {
    const theirMax = maxFifaPts(other);
    if (theirMax > myPts) {
      // They can get more points → can rank above us
      canRankAbove++;
    } else if (theirMax === myPts) {
      // They can tie us → tiebreaker decides. Check H2H.
      const result = h2hResult(row.team.id, other.team.id, fixtures);
      if (result !== 'win') {
        // We didn't beat them in H2H (lost, drew, or haven't played) → they
        // could rank above us via tiebreaker.
        canRankAbove++;
      }
    }
    // If theirMax < myPts they can never catch us — no increment.
  }

  return canRankAbove < targetPosition;
}
import { PLAYER_POINTS, TEAM_POINTS, KEEPER_POINTS } from './scoring';
import { matchesApiName, stripFlag } from './nameMap';
import { countryOfFlag, teamKey } from './teamCountry';

export type PlayerStats = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type KeeperStats = {
  saves: number;
  shutouts: number;
  wins: number;
};

export type TeamStats = {
  goalsScored: number;
  // Win/placement points earned from match *results*, round-aware: a group win
  // is worth groupWin, a knockout win the per-round bonus, and the final/3rd-place
  // matches pay out the tournament-placement bonuses (winner/runner-up/third).
  resultPoints: number;
  shutouts: number;
};

// Points a match result is worth to the winner (and, for the final, to the
// loser as runner-up) based on the API's round label. Goal and shutout points
// accrue separately, every round; this covers only the win/placement bonus.
export function roundResultPoints(round: string): { win: number; runnerUp: number } {
  const r = round.toLowerCase();
  if (r.includes('group')) return { win: TEAM_POINTS.groupWin, runnerUp: 0 };
  if (r.includes('round of 32')) return { win: TEAM_POINTS.r32Win, runnerUp: 0 };
  if (r.includes('round of 16')) return { win: TEAM_POINTS.r16Win, runnerUp: 0 };
  if (r.includes('quarter')) return { win: TEAM_POINTS.qfWin, runnerUp: 0 };
  if (r.includes('semi')) return { win: TEAM_POINTS.sfWin, runnerUp: 0 };
  // "3rd Place Final" must be matched before the bare "final" check below.
  if (r.includes('3rd place') || r.includes('third place'))
    return { win: TEAM_POINTS.thirdPlace, runnerUp: 0 };
  if (r.includes('final')) return { win: TEAM_POINTS.winner, runnerUp: TEAM_POINTS.runnerUp };
  return { win: 0, runnerUp: 0 };
}

// The winning side of a finished match, accounting for a penalty shootout when
// regulation/extra-time is level. Returns null for an unresolved draw (groups).
export function matchWinner(event: WCEvent): 'home' | 'away' | null {
  const h = event.homeScore?.current ?? 0;
  const a = event.awayScore?.current ?? 0;
  if (h > a) return 'home';
  if (a > h) return 'away';
  const ph = event.penaltyScore?.home ?? null;
  const pa = event.penaltyScore?.away ?? null;
  if (ph != null && pa != null) {
    if (ph > pa) return 'home';
    if (pa > ph) return 'away';
  }
  return null;
}

export type LiveStats = {
  players: Map<string, PlayerStats>; // API player name → stats
  keepers: Map<string, KeeperStats>; // API keeper name → stats (only keepers who played)
  teams: Map<string, TeamStats>; // API team name → stats
  playerTeam: Map<string, string>; // API player name → national team (for disambiguation)
};

export function accumulateLines(
  events: Array<{ event: WCEvent; lines: PlayerLine[] }>
): LiveStats {
  const players = new Map<string, PlayerStats>();
  const keepers = new Map<string, KeeperStats>();
  const teams = new Map<string, TeamStats>();
  const playerTeam = new Map<string, string>();

  const playerStats = (name: string) => {
    if (!players.has(name)) players.set(name, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    return players.get(name)!;
  };
  const keeperStats = (name: string) => {
    if (!keepers.has(name)) keepers.set(name, { saves: 0, shutouts: 0, wins: 0 });
    return keepers.get(name)!;
  };
  const teamStats = (name: string) => {
    if (!teams.has(name)) teams.set(name, { goalsScored: 0, resultPoints: 0, shutouts: 0 });
    return teams.get(name)!;
  };

  for (const { event, lines } of events) {
    const homeGoals = event.homeScore?.current ?? 0;
    const awayGoals = event.awayScore?.current ?? 0;
    const finished = event.status.type === 'finished';

    // Goals are locked in the moment they're scored — count them live.
    teamStats(event.homeTeam.name).goalsScored += homeGoals;
    teamStats(event.awayTeam.name).goalsScored += awayGoals;

    // Wins & clean sheets aren't settled until full time.
    const winner = finished ? matchWinner(event) : null;
    if (finished) {
      // Round-aware result points: group win = 3, knockout win = per-round
      // bonus, final winner/loser = winner/runner-up bonus, 3rd-place win = third.
      const rp = roundResultPoints(event.round);
      if (winner === 'home') {
        teamStats(event.homeTeam.name).resultPoints += rp.win;
        if (rp.runnerUp) teamStats(event.awayTeam.name).resultPoints += rp.runnerUp;
      } else if (winner === 'away') {
        teamStats(event.awayTeam.name).resultPoints += rp.win;
        if (rp.runnerUp) teamStats(event.homeTeam.name).resultPoints += rp.runnerUp;
      }
      if (awayGoals === 0) teamStats(event.homeTeam.name).shutouts += 1;
      if (homeGoals === 0) teamStats(event.awayTeam.name).shutouts += 1;
    }

    for (const line of lines) {
      const ps = playerStats(line.name);
      ps.goals += line.goals;
      ps.assists += line.assists;
      ps.yellowCards += line.yellow;
      ps.redCards += line.red;
      if (line.teamName) playerTeam.set(line.name, line.teamName);

      // Keeper scoring — only keepers who actually played.
      if (line.position === 'G' && (line.minutes ?? 0) > 0) {
        const ks = keeperStats(line.name);
        ks.saves += line.saves; // saves lock in live

        if (finished) {
          const isHome = line.teamId === event.homeTeam.id;
          const oppGoals = isHome ? awayGoals : homeGoals;
          if (oppGoals === 0) ks.shutouts += 1;
          if ((winner === 'home' && isHome) || (winner === 'away' && !isHome)) ks.wins += 1;
        }
      }
    }
  }

  return { players, keepers, teams, playerTeam };
}

// A second yellow card always converts to a red in the same match, so the API
// reports yellowCards=2 for that dismissal — only the first yellow is a
// separate scoring event; the second is subsumed by the red. Cap at 1/match.
function scoredYellowCards(stats: PlayerStats): number {
  return Math.min(stats.yellowCards, 1);
}

export function computePlayerPoints(stats: PlayerStats): number {
  return (
    stats.goals * PLAYER_POINTS.goal +
    stats.assists * PLAYER_POINTS.assist +
    scoredYellowCards(stats) * PLAYER_POINTS.yellowCard +
    stats.redCards * PLAYER_POINTS.redCard
  );
}

export function computeKeeperPoints(stats: KeeperStats): number {
  return (
    stats.wins * KEEPER_POINTS.win +
    stats.shutouts * KEEPER_POINTS.shutout +
    stats.saves * KEEPER_POINTS.save
  );
}

export function computeTeamPointsFromStats(stats: TeamStats): number {
  return (
    stats.goalsScored * TEAM_POINTS.goal +
    stats.resultPoints +
    stats.shutouts * TEAM_POINTS.shutout
  );
}

// Apply group position bonuses when a position is mathematically secured or final.
// Returns updated points map and a separate teamName → bonus map for transparency.
export function applyGroupBonuses(
  teamPoints: Map<string, number>,
  standings: StandingRow[],
  fixtures: WCEvent[]
): { points: Map<string, number>; bonuses: Map<string, number> } {
  const points = new Map(teamPoints);
  const bonuses = new Map<string, number>();

  // API-Football occasionally returns duplicate rows under "Group Stage" (no letter)
  // alongside the real group entries. Keep only named groups ("Group A", "Group B", …).
  const validStandings = standings.filter((r) => /^Group [A-Z]$/i.test(r.group ?? ''));

  // Which teams are scheduled to play in the Round of 32?  Only those 3rd-place
  // finishers count as "qualified" — the other 3rd-place teams are eliminated.
  const r32TeamIds = new Set<number>();
  for (const f of fixtures) {
    if (f.round.toLowerCase().includes('round of 32')) {
      r32TeamIds.add(f.homeTeam.id);
      r32TeamIds.add(f.awayTeam.id);
    }
  }

  // Group standings rows by group letter so we can reason about each group.
  const byGroup = new Map<string, StandingRow[]>();
  for (const row of validStandings) {
    const g = row.group ?? '';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(row);
  }

  for (const row of validStandings) {
    const name = row.team.name;
    const groupRows = byGroup.get(row.group ?? '') ?? [row];

    const final = row.matches >= 3;
    const pos1 = final || isPositionSecured(row, groupRows, fixtures, 1);
    const pos2 = final || isPositionSecured(row, groupRows, fixtures, 2);
    const pos3 = final || isPositionSecured(row, groupRows, fixtures, 3);

    let bonus = 0;
    if (row.position === 1 && pos1) {
      bonus = TEAM_POINTS.winGroup;
    } else if (row.position === 2 && pos2) {
      bonus = TEAM_POINTS.secondGroup;
    } else if (row.position === 3 && pos3 && r32TeamIds.has(row.team.id)) {
      // Only the 8 best 3rd-place teams advance to R32; the rest are eliminated.
      bonus = TEAM_POINTS.thirdQualified;
    }

    if (bonus > 0) {
      points.set(name, (points.get(name) ?? 0) + bonus);
      bonuses.set(name, bonus);
    }
  }

  return { points, bonuses };
}

// Find the best-matching API name for a pool pick label
export function findMatchingApiName(
  pickLabel: string,
  apiNames: Iterable<string>
): string | null {
  const stripped = stripFlag(pickLabel);
  for (const apiName of apiNames) {
    if (matchesApiName(stripped, apiName)) return apiName;
  }
  return null;
}

// Match a player/keeper pick to an API name, disambiguating shared surnames by
// the pick's country (from its flag). When the pick's country is known, only a
// candidate on that national team counts — so "🇪🇬Salah" can't match Morocco's
// Salah-Eddine. Falls back to plain name matching when the flag is unknown.
export function findPlayerByCountry(
  pickLabel: string,
  apiNames: Iterable<string>,
  teamOf: (apiName: string) => string | undefined
): string | null {
  const stripped = stripFlag(pickLabel);
  const country = countryOfFlag(pickLabel);
  const nameMatches: string[] = [];
  for (const apiName of apiNames) {
    if (matchesApiName(stripped, apiName)) nameMatches.push(apiName);
  }
  if (nameMatches.length === 0) return null;
  if (!country) return nameMatches[0]; // unknown flag → best-effort
  const inCountry = nameMatches.find((n) => teamKey(teamOf(n) ?? '') === country);
  // Country known but no same-nation candidate → don't credit the wrong player.
  return inCountry ?? null;
}

// Match a team pick to an API team name — by country first (robust to naming
// like "Côte d'Ivoire" vs "Ivory Coast"), then by name.
export function findTeamByCountry(
  pickLabel: string,
  teamNames: Iterable<string>
): string | null {
  const country = countryOfFlag(pickLabel);
  if (country) {
    for (const n of teamNames) {
      if (teamKey(n) === country) return n;
    }
  }
  return findMatchingApiName(pickLabel, teamNames);
}

export type PickImpact = {
  label: string;
  points: number;
  breakdown?: BreakdownItem[];
};

export type BreakdownItem = { label: string; points: number; color: string };

function playerBreakdown(stats: PlayerStats): BreakdownItem[] {
  const items: BreakdownItem[] = [];
  const yellows = scoredYellowCards(stats);
  if (stats.goals > 0)    items.push({ label: `${stats.goals} goal${stats.goals !== 1 ? 's' : ''}`, points: stats.goals * PLAYER_POINTS.goal, color: 'green' });
  if (stats.assists > 0)  items.push({ label: `${stats.assists} assist${stats.assists !== 1 ? 's' : ''}`, points: stats.assists * PLAYER_POINTS.assist, color: 'sky' });
  if (yellows > 0)        items.push({ label: `${yellows} yellow card${yellows !== 1 ? 's' : ''}`, points: yellows * PLAYER_POINTS.yellowCard, color: 'amber' });
  if (stats.redCards > 0) items.push({ label: `${stats.redCards} red card${stats.redCards !== 1 ? 's' : ''}`, points: stats.redCards * PLAYER_POINTS.redCard, color: 'red' });
  return items;
}

function keeperBreakdown(stats: KeeperStats): BreakdownItem[] {
  const items: BreakdownItem[] = [];
  if (stats.wins > 0)     items.push({ label: 'Win', points: stats.wins * KEEPER_POINTS.win, color: 'blue' });
  if (stats.shutouts > 0) items.push({ label: 'Shutout', points: stats.shutouts * KEEPER_POINTS.shutout, color: 'teal' });
  if (stats.saves > 0)    items.push({ label: `${stats.saves} save${stats.saves !== 1 ? 's' : ''}`, points: stats.saves * KEEPER_POINTS.save, color: 'cyan' });
  return items;
}

// Which pool picks earned points in a single match (for the live banner).
// Checks keepers first (so a keeper pick scores saves, not stray player points),
// then outfield players, then teams.
export function computeMatchImpacts(
  matchStats: LiveStats,
  matchTeamPoints: Map<string, number>,
  poolPickLabels: Iterable<string>
): PickImpact[] {
  const impacts: PickImpact[] = [];
  const seen = new Set<string>();

  const teamOf = (n: string) => matchStats.playerTeam.get(n);

  for (const label of poolPickLabels) {
    if (seen.has(label)) continue;

    const keeperMatch = findPlayerByCountry(label, matchStats.keepers.keys(), teamOf);
    if (keeperMatch) {
      const ks = matchStats.keepers.get(keeperMatch)!;
      const pts = computeKeeperPoints(ks);
      if (pts > 0) {
        impacts.push({ label, points: pts, breakdown: keeperBreakdown(ks) });
        seen.add(label);
        continue;
      }
    }

    const playerMatch = findPlayerByCountry(label, matchStats.players.keys(), teamOf);
    if (playerMatch) {
      const ps = matchStats.players.get(playerMatch)!;
      const pts = computePlayerPoints(ps);
      if (pts > 0) {
        impacts.push({ label, points: pts, breakdown: playerBreakdown(ps) });
        seen.add(label);
      }
      continue;
    }

    const teamMatch = findMatchingApiName(label, matchTeamPoints.keys());
    if (teamMatch) {
      const pts = matchTeamPoints.get(teamMatch) ?? 0;
      if (pts > 0) {
        impacts.push({ label, points: pts });
        seen.add(label);
      }
    }
  }

  return impacts.sort((a, b) => b.points - a.points);
}
