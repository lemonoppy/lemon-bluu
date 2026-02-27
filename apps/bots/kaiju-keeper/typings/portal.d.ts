export type BasicUserInfo = {
  uid: number;
  username: string;
};

export type PortalPlayer = {
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