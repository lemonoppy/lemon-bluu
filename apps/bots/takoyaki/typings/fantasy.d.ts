export type FantasyPlayer = {
  name: string;
  position: string;
  team: string;
  score: number;
};

export type FantasyAdpPlayer = {
  player: string;
  team: string;
  position: string;
  adp: number;
  median: number;
  count: number;
};

export type FantasyRosteredPlayer = {
  username: string;
  group: number | string;
  rosterPosition: string;
  name: string;
  position: string;
  team: string;
  start: number;
  end?: number;
  score: number;
};

export type FantasyUser = {
  username: string;
  group: number | string;
  score: number;
  rank: number;
  overall: number;
};
