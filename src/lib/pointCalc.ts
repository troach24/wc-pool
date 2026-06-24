import type { Incident, StandingRow, WCEvent } from './api';
import { PLAYER_POINTS, TEAM_POINTS } from './scoring';
import { matchesApiName, stripFlag } from './nameMap';

export type PlayerStats = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type TeamStats = {
  goalsScored: number;
  wins: number;
  shutouts: number;
};

export type LiveStats = {
  players: Map<string, PlayerStats>; // API player name → stats
  teams: Map<string, TeamStats>;     // API team name → stats
};

export function accumulateIncidents(
  events: Array<{ event: WCEvent; incidents: Incident[] }>
): LiveStats {
  const players = new Map<string, PlayerStats>();
  const teams = new Map<string, TeamStats>();

  function playerStats(name: string): PlayerStats {
    if (!players.has(name)) players.set(name, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    return players.get(name)!;
  }

  function teamStats(name: string): TeamStats {
    if (!teams.has(name)) teams.set(name, { goalsScored: 0, wins: 0, shutouts: 0 });
    return teams.get(name)!;
  }

  for (const { event, incidents } of events) {
    const home = event.homeTeam.name;
    const away = event.awayTeam.name;
    const homeGoals = event.homeScore?.current ?? 0;
    const awayGoals = event.awayScore?.current ?? 0;
    const finished = event.status.type === 'finished';

    if (finished) {
      // Team goals
      teamStats(home).goalsScored += homeGoals;
      teamStats(away).goalsScored += awayGoals;

      // Wins
      if (homeGoals > awayGoals) teamStats(home).wins += 1;
      else if (awayGoals > homeGoals) teamStats(away).wins += 1;

      // Shutouts
      if (awayGoals === 0) teamStats(home).shutouts += 1;
      if (homeGoals === 0) teamStats(away).shutouts += 1;
    }

    for (const inc of incidents) {
      if (inc.incidentType === 'goal' && inc.incidentClass !== 'ownGoal') {
        const name = inc.player?.name;
        if (name) playerStats(name).goals += 1;
        const assist = inc.assist1?.name;
        if (assist) playerStats(assist).assists += 1;
      }
      if (inc.incidentType === 'card') {
        const name = inc.player?.name;
        if (!name) continue;
        if (inc.incidentClass === 'yellow') playerStats(name).yellowCards += 1;
        if (inc.incidentClass === 'red') playerStats(name).redCards += 1;
      }
    }
  }

  return { players, teams };
}

export function computePlayerPoints(stats: PlayerStats): number {
  return (
    stats.goals * PLAYER_POINTS.goal +
    stats.assists * PLAYER_POINTS.assist +
    stats.yellowCards * PLAYER_POINTS.yellowCard +
    stats.redCards * PLAYER_POINTS.redCard
  );
}

export function computeTeamPointsFromStats(stats: TeamStats): number {
  return (
    stats.goalsScored * TEAM_POINTS.goal +
    stats.wins * TEAM_POINTS.groupWin +
    stats.shutouts * TEAM_POINTS.shutout
  );
}

// Apply group position bonuses from standings
export function applyGroupBonuses(
  teamPoints: Map<string, number>,
  standings: StandingRow[]
): Map<string, number> {
  const result = new Map(teamPoints);

  // Group rows by group (each group has 4 teams)
  // The standings endpoint returns all rows; we look for position 1 = win group
  for (const row of standings) {
    const name = row.team.name;
    const existing = result.get(name) ?? 0;
    let bonus = 0;

    // Only award position bonus after all group games played (3 matches)
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
