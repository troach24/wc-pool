// Pool scoring rules (authoritative per spec)
// Cards score POSITIVE points — intentional.

export const TEAM_POINTS = {
  goal: 1,
  shutout: 3,
  groupWin: 3,
  winGroup: 8,
  secondGroup: 4,
  thirdQualified: 2,
  r32Win: 5,
  r16Win: 5,
  qfWin: 5,
  sfWin: 5,
  thirdPlace: 7,
  runnerUp: 10,
  winner: 15,
} as const;

export const PLAYER_POINTS = {
  goal: 5,
  assist: 3,
  yellowCard: 10,
  redCard: 15,
} as const;

export const KEEPER_POINTS = {
  win: 3,
  shutout: 3,
  save: 1,
} as const;

export function sumEntry(entry: { teams: [any,any,any]; players: [any,any,any]; keepers: [any,any,any] }): number {
  const all = [...entry.teams, ...entry.players, ...entry.keepers];
  return all.reduce((sum, p) => sum + (p.points ?? 0), 0);
}
