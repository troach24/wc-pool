export type Pick = {
  label: string;
  points: number;
};

export type Entry = {
  name: string;
  teams: [Pick, Pick, Pick];
  players: [Pick, Pick, Pick];
  keepers: [Pick, Pick, Pick];
  points: number;
  note?: string;
};
