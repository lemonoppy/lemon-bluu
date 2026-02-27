export type FantasyPlayer = {
  name: string;
  position: string;
  team: string;
  score: number;
};

export type FantasyRosteredPlayer = {
  username: string;
  group: number;
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
  group: number;
  score: number;
  rank: number;
  overall: number;
}