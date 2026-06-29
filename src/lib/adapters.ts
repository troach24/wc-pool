import type { Entry, Pick } from './types';

type RawEntry = {
  name: string;
  teams: [string, string, string];
  players: [string, string, string];
  keepers: [string, string, string];
  note?: string;
};

function toPick(label: string): Pick {
  return { label: label.trim() };
}

export function fromRaw(raw: RawEntry): Entry {
  return {
    name: raw.name,
    teams: raw.teams.map(toPick) as [Pick, Pick, Pick],
    players: raw.players.map(toPick) as [Pick, Pick, Pick],
    keepers: raw.keepers.map(toPick) as [Pick, Pick, Pick],
    note: raw.note,
  };
}
