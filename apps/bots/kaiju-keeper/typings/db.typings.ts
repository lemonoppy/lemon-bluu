type BaseRecord = {
  id: number;
  season: number;
  week: number;
  pid: number;
  position: string;
  firstname: string;
  lastname: string;
  status: 'active' | 'retired' | 'bot';
  onteam: boolean;
  [key: string]: number | string | boolean | undefined;
}

export type Player = {
  id: number;
  name: string;
  pid?: number;
  uid?: number;
  firstname?: string;
  lastname?: string;
  position?: string;
  status: 'active' | 'retired' | 'bot';
  onteam: boolean;
}

export type GameStats = {
  id: number;
  season: number;
  week: number;
  home: boolean;
  opponent: string;
  score: number;
  opponentscore: number;
  isplayoffs: boolean;
  win: boolean;
}

export type PassingStats = BaseRecord & {
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

export type RushingStats = BaseRecord & {
  attempts: number;
  yards: number;
  ypc: number;
  long: number;
  td: number;
}

export type ReceivingStats = BaseRecord & {
  receptions: number;
  targets: number;
  yards: number;
  ypr: number;
  long: number;
  td: number;
}

export type DefensiveStats = BaseRecord & {
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

export type KickingStats = BaseRecord & {
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

export type PuntingStats = BaseRecord & {
  punts: number;
  yds: number;
  avg: number;
  lng: number;
  inside20: number;
}

export type OtherStats = BaseRecord & {
  penalties: number;
  yards: number;
  pancakes: number;
  sacksallowed: number;
}