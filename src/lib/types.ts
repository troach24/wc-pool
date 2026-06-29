export type Pick = {
  label: string;
};

export type Entry = {
  name: string;
  teams: [Pick, Pick, Pick];
  players: [Pick, Pick, Pick];
  keepers: [Pick, Pick, Pick];
  note?: string;
};
