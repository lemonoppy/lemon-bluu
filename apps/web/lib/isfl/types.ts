export interface DraftPick {
  season: number;
  round: number;
  pick: number; // overall pick number in the draft
  pid: number;
  type: string; // 'comp' or 'regular'
  originalTeam: string;
  owningTeam: string;
  username: string;
  name: string;
  highestTPE: number;
}

export interface RoundStat {
  round: number;
  avg: number;
  median: number;
  count: number;
}

export interface PercentileStat {
  label: string; // e.g. "0–10%"
  bucket: number; // 0–9
  avg: number;
  median: number;
  count: number;
}

export interface PickStat {
  round: number;
  pick: number;
  avg: number;
}

export interface ClassTrend {
  season: number;
  avg: number;
  median: number;
  top10Avg: number;
  top20Avg: number;
  count: number;
}

export interface PickEV {
  pick: number;
  percentile: number;
  ev: number;
}

export interface TeamEfficiency {
  team: string;
  picks: number;
  avgTPE: number;
  expectedTPE: number;
  delta: number;
}
