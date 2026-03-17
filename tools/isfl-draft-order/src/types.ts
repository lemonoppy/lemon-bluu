export type Team = {
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
};

export type Game = {
  homeTeam: string;
  awayTeam: string;
  winner: 'home' | 'away' | 'tie';
};

export type PlayoffGame = {
  gid: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: 'home' | 'away' | null;
};

export type StandingsResponse = {
  season: number;
  regularSeason: Team[];
  games: Game[];
  postseason: PlayoffGame[];
};

export type DraftEntry = {
  pick: number;
  team: string;
  abbreviation: string;
  record: string;
  madePlayoffs: boolean;
  eliminatedRound?: number; // actual week number (17/18/19/20) for completed seasons
  projectedRound?: number;  // 1=WC, 2=Conference, 3=Championship for in-progress seasons
  tiebreaker?: string;
};
