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
  groupName: string;
  score: number;
  rank: number;
  overall: number;
};

export type FantasySeason = {
  id: number;
  leagueSeasonId: number;
  number: number;
  name: string;
  isCurrent: boolean;
};

export type FantasyGroup = {
  id: number;
  number: number;
  name: string;
  leagueSeasonId: number;
};

export type FantasyTeam = {
  id: number;
  name: string;
  abbreviation: string;
  groupId: number;
  leagueSeasonId: number;
  draftPosition: number;
  ownerName: string;
};

export type FantasyRosterEntry = {
  membershipId: number;
  playerSeasonId: number;
  playerId: number;
  name: string;
  position: string;
  realTeam: string;
  rosterSlot: string;
  startWeek: number;
  endWeek: number | null;
};

export type FantasyDraftPick = {
  pick: number;
  playerSeasonId: number | null;
  playerName: string | null;
  position: string | null;
  realTeam: string | null;
};

export type FantasyPlayerPoints = {
  playerSeasonId: number;
  name: string;
  position: string;
  realTeam: string;
  weekScores: Record<string, number>;
  total: number;
};
