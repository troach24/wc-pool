import type { Entry, Pick } from './types';

type RawPick = [string, number];
type RawEntry = {
  name: string;
  teams: [RawPick, RawPick, RawPick];
  players: [RawPick, RawPick, RawPick];
  keepers: [RawPick, RawPick, RawPick];
  points: number;
  note?: string;
};

function toPick([label, points]: RawPick): Pick {
  return { label: label.trim(), points };
}

export function fromRaw(raw: RawEntry): Entry {
  return {
    name: raw.name,
    teams: raw.teams.map(toPick) as [Pick, Pick, Pick],
    players: raw.players.map(toPick) as [Pick, Pick, Pick],
    keepers: raw.keepers.map(toPick) as [Pick, Pick, Pick],
    points: raw.points,
    note: raw.note,
  };
}
