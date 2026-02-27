export type DraftUsers = {
  season: number;
  name: string;
  count: number;
  firstRounder?: boolean;
}

export type DraftSeason = {
  season: number;
  count: number;
}

export type CombinePlayer = {
  season: number;
  player: string;
  position: string;
  wonderlic: number;
  bench: number;
  vertical: number;
  broad: number;
  shuttle: number;
  threecone: number;
  tensplit: number;
  twentysplit: number;
  fourtysplit: number;
  ras: number;
}