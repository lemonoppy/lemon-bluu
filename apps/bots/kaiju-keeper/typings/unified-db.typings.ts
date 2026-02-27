// Unified database type definitions
// These replace the team-specific types with unified tables containing team columns

export type UnifiedPlayer = {
  id: number;
  name: string;
  pid?: number;
  uid?: number;
  firstname?: string;
  lastname?: string;
  status: 'active' | 'retired' | 'bot';
  created_at: Date;
  updated_at: Date;
}

export type PlayerGame = {
  id: number;
  pid: number;
  season: number;
  week: number;
  team: string;
  position?: string;
  created_at: Date;
}

export type UnifiedGameStats = {
  id: number;
  season: number;
  week: number;
  team: string;
  home: boolean;
  opponent: string;
  score: number;
  opponentscore: number;
  isplayoffs: boolean;
  win: boolean;
  created_at: Date;
}

// Base type for all stat records
type BaseStatRecord = {
  id: number;
  season: number;
  week: number;
  pid: number;
  team: string;
  created_at: Date;
}

export type UnifiedPassingStats = BaseStatRecord & {
  completions: number;
  attempts: number;
  completionpct: number;
  yards: number;
  ypa: number;
  td: number;
  int: number;
  rating: number;
  sacks: number;
}

export type UnifiedRushingStats = BaseStatRecord & {
  attempts: number;
  yards: number;
  ypc: number;
  long: number;
  td: number;
}

export type UnifiedReceivingStats = BaseStatRecord & {
  receptions: number;
  targets: number;
  yards: number;
  ypr: number;
  long: number;
  td: number;
}

export type UnifiedDefenseStats = BaseStatRecord & {
  tck: number;
  tfl: number;
  sack: number;
  ff: number;
  fr: number;
  pd: number;
  int: number;
  sfty: number;
  td: number;
  blkp: number;
  blkxp: number;
  blkfg: number;
}

export type UnifiedKickingStats = BaseStatRecord & {
  xpmade: number;
  xpatt: number;
  fgunder20made: number;
  fgunder20att: number;
  fg20_29made: number;
  fg20_29att: number;
  fg30_39made: number;
  fg30_39att: number;
  fg40_49made: number;
  fg40_49att: number;
  fg50plusmade: number;
  fg50plusatt: number;
}

export type UnifiedPuntingStats = BaseStatRecord & {
  punts: number;
  yds: number;
  avg: number;
  lng: number;
  inside20: number;
}

export type UnifiedOtherStats = BaseStatRecord & {
  penalties: number;
  yards: number;
  pancakes: number;
  sacksallowed: number;
}

export type UnifiedSpecialTeamsStats = BaseStatRecord & {
  kr: number;
  kryds: number;
  krtd: number;
  krlng: number;
  pr: number;
  pryds: number;
  prtd: number;
  prlng: number;
}

// Enhanced types that include player information for display
export type UnifiedPassingStatsWithPlayer = UnifiedPassingStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedRushingStatsWithPlayer = UnifiedRushingStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedReceivingStatsWithPlayer = UnifiedReceivingStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedDefenseStatsWithPlayer = UnifiedDefenseStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedKickingStatsWithPlayer = UnifiedKickingStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedPuntingStatsWithPlayer = UnifiedPuntingStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedOtherStatsWithPlayer = UnifiedOtherStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}

export type UnifiedSpecialTeamsStatsWithPlayer = UnifiedSpecialTeamsStats & {
  player_name: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  onteam: boolean;
  status: 'active' | 'retired' | 'bot';
}