export type BasicUserInfo = {
  uid: number;
  username: string;
};

export type Player = {
  pid: number;
  uid: number;
  currentLeague: 'ISFL' | 'DSFL' | null;
  isflTeam: string | null;
  dsflTeam: string | null;
  firstName: string;
  lastName: string;
  draftSeason: number | null;
  render: string;
  jerseyNumber: number;
  recruiter: string | null;
  recruiterId: number | null;
  status: 'active' | 'pending' | 'retired' | 'denied';
  approverId: number | null;
  creationDate: string;
  approvedDate: string | null;
  retirementDate: string | null;
  position:
    | 'Quarterback'
    | 'Running Back'
    | 'Wide Receiver'
    | 'Tight End'
    | 'Offensive Lineman'
    | 'Defensive End'
    | 'Defensive Tackle'
    | 'Linebacker'
    | 'Cornerback'
    | 'Safety'
    | 'Kicker';
  archetype: string;
  wfcRegion: string | null;
  highestTPE: number;
  totalTPE: number;
  bankedTPE: number;
  appliedTPE: number;
  secondaryTPE: number;
  tertiaryTPE: number;
  positionChanged: boolean;
  archetypeChanged: boolean;
  rookieChanged: boolean;
  usedRedistribution: number;
  equipmentPurchased: number;
  trainingCamp: boolean;
  bankBalance: number;
  taskStatus: 'Draftee Free Agent' | 'DSFL Rookie' | 'ISFL/Send-down';
  attributes: PlayerAttributes;
  traits: any;
  isSuspended: boolean;
  suspendedUntil: string | null;
  inactive: boolean;
  birthplace: string | null;
  college: string | null;
  weeklyTraining: number;
  weeklyActivityCheck: number;
  username?: string | null;
  simId?: number | null;
  isCaptain?: boolean;
  isRookie?: boolean;
  activeStatus?: string;
}

export type PlayerAttributes = {
  strength: number;
  agility: number;
  intelligence: number;
  arm: number;
  throwingAccuracy: number;
  tackling: number;
  speed: number;
  hands: number;
  passBlocking: number;
  runBlocking: number;
  endurance: number;
  kickPower: number;
  kickAccuracy: number;
  competitiveness: number;
};

export type ManagerInfo = {
  id: number;
  uid: number;
  team: string;
  league: 'ISFL' | 'DSFL' | 'WFC';
  createdDate: string;
  username: string;
};

export type Team = {
  nameRegex: RegExp;
  league: 'ISFL' | 'DSFL' | 'WFC';
  conference: string;
  name: string;
  abbreviation: string;
  location: string;
  colors: { primary: string; secondary: string; text: string };
  logoUrl: string,
  emoji: string,
  id: number,
};

export type Season = {
  id: number;
  season: number;
  startDate: string;
  endDate: string;
  ended: boolean;
};

export type BankAccountHeaderData = {
  uid: number;
  username: string;
  avatar: string;
  bankBalance: number;
  currentLeague?: 'ISFL' | 'DSFL' | null;
  isflTeam?: string | null;
  dsflTeam?: string | null;
  pid?: number;
  firstName?: string;
  lastName?: string;
};

export type IATracker = {
  latestDate?: string;
};

export type TeamStanding = {
  abbreviation: string;
  name: string;
  location: string;
  league: string;
  conference: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  pf: number;
  pa: number;
  diff: number;
  homeRecord: { wins: number; losses: number; ties: number };
  awayRecord: { wins: number; losses: number; ties: number };
  confRecord: { wins: number; losses: number; ties: number };
};

export type PlayoffGame = {
  gid: string;
  week: number;
  league: string;
  homeTeam: string;
  homeTeamName: string;
  homeTeamLocation: string;
  awayTeam: string;
  awayTeamName: string;
  awayTeamLocation: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: 'home' | 'away' | 'tie' | null;
};

export type StandingsResponse = {
  season: number;
  regularSeason: TeamStanding[];
  postseason: PlayoffGame[];
  games: Array<{ homeTeam: string; awayTeam: string; winner: 'home' | 'away' | 'tie' }>;
};

export type TeamHistoryRecord = {
  abbreviation: string;
  name: string;
  location: string;
  league: string;
  regWins: number;
  regLosses: number;
  regTies: number;
  playoffWins: number;
  playoffLosses: number;
  playoffTies: number;
  championships: number;
  runnerUps: number;
};

export type TeamHistoryResponse = {
  records: TeamHistoryRecord[];
  matchups: Record<string, Record<string, { wins: number; losses: number; ties: number }>>;
  matchupsReg: Record<string, Record<string, { wins: number; losses: number; ties: number }>>;
  matchupsPlayoff: Record<string, Record<string, { wins: number; losses: number; ties: number }>>;
};

export type GMRecord = {
  uid: number;
  username: string;
  league: string;
  seasons: number;
  regWins: number;
  regLosses: number;
  regTies: number;
  regGames: number;
  playoffWins: number;
  playoffLosses: number;
  playoffTies: number;
  playoffGames: number;
  championships: number;
};

export type Award = {
  id: number;
  season: number;
  pid: number;
  team: string | null;
  type: string;
  position?: string;
  firstName?: string;
  lastName?: string;
  uid?: number;
  username?: string;
  isFirstPlayer?: number;
  wfcRegion?: string | null;
};