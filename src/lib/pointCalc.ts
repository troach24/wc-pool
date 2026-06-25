import type { PlayerLine, StandingRow, WCEvent } from './api';
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
  wins: number;
  shutouts: number;
};

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
    if (!teams.has(name)) teams.set(name, { goalsScored: 0, wins: 0, shutouts: 0 });
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
    if (finished) {
      if (homeGoals > awayGoals) teamStats(event.homeTeam.name).wins += 1;
      else if (awayGoals > homeGoals) teamStats(event.awayTeam.name).wins += 1;
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
          const ownGoals = isHome ? homeGoals : awayGoals;
          const oppGoals = isHome ? awayGoals : homeGoals;
          if (oppGoals === 0) ks.shutouts += 1;
          if (ownGoals > oppGoals) ks.wins += 1;
        }
      }
    }
  }

  return { players, keepers, teams, playerTeam };
}

export function computePlayerPoints(stats: PlayerStats): number {
  return (
    stats.goals * PLAYER_POINTS.goal +
    stats.assists * PLAYER_POINTS.assist +
    stats.yellowCards * PLAYER_POINTS.yellowCard +
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
    stats.wins * TEAM_POINTS.groupWin +
    stats.shutouts * TEAM_POINTS.shutout
  );
}

// Apply group position bonuses from standings (only once all 3 group games played)
export function applyGroupBonuses(
  teamPoints: Map<string, number>,
  standings: StandingRow[]
): Map<string, number> {
  const result = new Map(teamPoints);

  for (const row of standings) {
    const name = row.team.name;
    const existing = result.get(name) ?? 0;
    let bonus = 0;

    if (row.matches >= 3) {
      if (row.position === 1) bonus = TEAM_POINTS.winGroup;
      else if (row.position === 2) bonus = TEAM_POINTS.secondGroup;
      else if (row.position === 3) bonus = TEAM_POINTS.thirdQualified;
    }

    if (bonus > 0) result.set(name, existing + bonus);
  }

  return result;
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

export type PickImpact = { label: string; points: number };

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
      const pts = computeKeeperPoints(matchStats.keepers.get(keeperMatch)!);
      if (pts > 0) {
        impacts.push({ label, points: pts });
        seen.add(label);
        continue;
      }
    }

    const playerMatch = findPlayerByCountry(label, matchStats.players.keys(), teamOf);
    if (playerMatch) {
      const pts = computePlayerPoints(matchStats.players.get(playerMatch)!);
      if (pts > 0) {
        impacts.push({ label, points: pts });
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
