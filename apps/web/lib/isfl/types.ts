export interface Player {
  pid: number;
  uid: number;
  firstName?: string | null;
  lastName?: string | null;
  draftSeason?: number | null;
  status?: string | null;
  creationDate?: string | null;
  retirementDate?: string | null;
  appliedTPE?: number | null;
  secondaryTPE?: number | null;
  tertiaryTPE?: number | null;
  highestTPE?: number | null;
  isflTeam?: string | null;
  dsflTeam?: string | null;
  position?: string | null;
  archetype?: string | null;
  jerseyNumber?: number | null;
  birthplace?: string | null;
  currentLeague?: string | null;
  wfcRegion?: string | null;
  positionChanged?: boolean | null;
  archetypeChanged?: boolean | null;
  rookieChanged?: boolean | null;
  usedRedistribution?: number | null;
  equipmentPurchased?: number | null;
  trainingCamp?: number | null;
  isSuspended?: boolean | null;
  render?: string | null;
  college: string;
  recruiter?: string | null;
  username?: string | null;
  simId?: number | null;
  traits?: string | null;
  isCaptain?: boolean | null;
  isRookie?: boolean | null;
  posDesignation?: string | null;
}

export interface PlayerStats {
  pid: number;
  gid: string;
  season: number;
  week: number;
  team: string;
  position?: string | null;
  seasonstate: string;
  passcmp: number;
  passatt: number;
  passyds: number;
  passavg: number;
  passtd: number;
  passint: number;
  passrat: number;
  passsacked: number;
  passsackedyards: number;
  rushatt: number;
  rushyds: number;
  rushavg: number;
  rushtd: number;
  rushlg: number;
  recrec: number;
  recyds: number;
  recavg: number;
  rectd: number;
  rectar: number;
  reclg: number;
  kxpm: number;
  kxpa: number;
  kfgmu20: number;
  kfgau20: number;
  kfgm2029: number;
  kfga2029: number;
  kfgm3039: number;
  kfga3039: number;
  kfgm4049: number;
  kfga4049: number;
  kfgm50: number;
  kfga50: number;
  ppunts: number;
  pyds: number;
  pavg: number;
  plng: number;
  pinside20: number;
  deftck: number;
  deftfl: number;
  defsack: number;
  defpd: number;
  defint: number;
  defsfty: number;
  deftd: number;
  defff: number;
  deffr: number;
  defblkp: number;
  defblkxp: number;
  defblkfg: number;
  stkr: number;
  stkryds: number;
  stkrtd: number;
  stkrlng: number;
  stpr: number;
  stpryds: number;
  stprtd: number;
  stprlng: number;
  otherpancakes: number;
  othersacksallowed: number;
  otherpenalties: number;
  otherpenyards: number;
  createdat?: string | null;
  updatedat?: string | null;
}

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
  pct: number; // within-season draft percentile, 0 = first pick
}
