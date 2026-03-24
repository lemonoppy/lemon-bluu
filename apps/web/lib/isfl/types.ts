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
  p25: number; // 25th percentile TPE at this slot
  p75: number; // 75th percentile TPE at this slot
  hitRate: number; // % of picks at this slot that hit 2× season median
  relValue: number; // EV as % of pick 1's EV
}

export interface TeamEfficiency {
  team: string;
  picks: number;
  avgTPE: number;
  expectedTPE: number;
  delta: number;
}

export interface EraEfficiency {
  era: string; // e.g. "S1–10"
  picks: number;
  avgTPE: number;
  expectedTPE: number;
  delta: number;
}

export interface TeamEfficiencyTrend {
  team: string;
  eras: EraEfficiency[];
}

export interface GMData {
  uid: number;
  username: string;
  season: number;
  team: string;
}

export interface GMEfficiency {
  username: string;
  picks: number;
  avgTPE: number;
  expectedTPE: number;
  delta: number;
}

export interface DraftPickDetail {
  round: number;
  pick: number;
  pid: number;
  name: string;
  highestTPE: number;
  expectedTPE: number;
  delta: number;
}

export interface DraftResult {
  team: string;
  season: number;
  picks: number;
  avgTPE: number;
  expectedTPE: number;
  delta: number;
  pickDetails: DraftPickDetail[];
}

export interface UserPickResult {
  season: number;
  round: number;
  pick: number; // overall
  pid: number;
  name: string;
  owningTeam: string;
  highestTPE: number;
  expectedTPE: number;
  delta: number;
}
