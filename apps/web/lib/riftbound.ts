export interface LocationJson {
  formattedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  city?: string | null;
  adminArea1?: string | null;
}

export interface LeaderboardStats {
  events: number;
  completedEvents: number;
  liveEvents: number;
  players: number;
  linkedPlayers: number;
  matches: number;
  games: number;
  stores: number;
  lastCompletedAt: string | null;
}

export interface LeaderboardPlayer {
  playerId: string;
  displayName: string;
  tagLine: string | null;
  eloshowdownPlayerId: number | null;
  currentElo: number | null;
  isSquad: boolean;
  communityEligible: boolean;
  localEvents: number;
  lastEventAt: string | null;
  rank: number | null;
}

export interface LeaderboardResponse {
  stats: LeaderboardStats;
  players: LeaderboardPlayer[];
}

export interface EventSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  tournamentType: string | null;
  structure: string | null;
  roundCount: number | null;
  topCut: number | null;
  storeId: string | null;
  storeName: string | null;
  playerCount: number;
  matchCount: number;
  winnerName: string | null;
  winnerPlayerId: string | null;
}

export interface EventsResponse {
  events: EventSummary[];
}

export interface EventStanding {
  rank: number | null;
  playerId: string;
  displayName: string;
  tagLine: string | null;
  status: string | null;
  matchPoints: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  omw: number | null;
  gw: number | null;
  ogw: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  eloChange: number | null;
}

export interface EventRound {
  roundNumber: number;
  stageId: string | null;
  sectionType: string | null;
  status: string | null;
  startedAt: string | null;
  durationMin: number | null;
  byeTeamIds: string[];
}

export interface EventMatchSide {
  teamId: string | null;
  playerId: string | null;
  displayName: string | null;
  outcome: string | null;
  gamesWon: number;
}

export interface EventMatch {
  matchId: string;
  roundNumber: number;
  tableNumber: number | null;
  strategy: string | null;
  state: 'final' | 'in_progress' | 'pending';
  team1: EventMatchSide;
  team2: EventMatchSide;
  ties: number;
  games: number;
}

export interface EventDetailResponse {
  event: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string | null;
    status: string;
    tournamentType: string | null;
    structure: string | null;
    roundCount: number | null;
    topCut: number | null;
    lastFetchedAt: string | null;
    platformUpdatedAt: string | null;
    location: LocationJson | null;
    store: { id: string; name: string; address: LocationJson | null } | null;
  };
  standingsRound: number | null;
  standings: EventStanding[];
  rounds: EventRound[];
  matches: EventMatch[];
}

export interface PlayerEventRow {
  eventId: string;
  eventName: string;
  startsAt: string;
  status: string;
  isLocal: boolean;
  tournamentType: string | null;
  storeName: string | null;
  finalRank: number | null;
  record: string | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  eloChange: number | null;
  eloshowdownPlayerId: number | null;
}

export interface PlayerMatchRow {
  matchId: string;
  eventId: string;
  eventName: string;
  startsAt: string;
  roundNumber: number;
  tableNumber: number | null;
  opponentPlayerId: string | null;
  opponentName: string | null;
  outcome: string | null;
  gamesWon: number;
  gamesLost: number;
  ties: number;
  games: number;
  isBye?: boolean;
}

export interface PlayerMatchup {
  opponentPlayerId: string | null;
  opponentName: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  lastPlayedAt: string;
}

export interface EloHistoryPoint {
  date: string;
  eloAfter: number;
  eloChange: number;
  opponentName: string | null;
  result: string | null;
}

export interface PlayerProfileResponse {
  player: {
    playerId: string;
    displayName: string;
    tagLine: string | null;
    eloshowdownPlayerId: number | null;
    currentElo: number | null;
    isSquad: boolean;
    communityEligible: boolean;
    eventsPlayed: number;
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number | null;
    bestFinish: number | null;
    lastEventAt: string | null;
    peakElo: number | null;
  };
  events: PlayerEventRow[];
  matches: PlayerMatchRow[];
  matchups: PlayerMatchup[];
  eloHistory: EloHistoryPoint[];
}

export interface H2HResponse {
  playerA: { playerId: string; displayName: string; wins: number };
  playerB: { playerId: string; displayName: string; wins: number };
  draws: number;
  matches: {
    matchId: string;
    eventId: string;
    eventName: string;
    startsAt: string;
    roundNumber: number;
    tableNumber: number | null;
    aOutcome: string | null;
    bOutcome: string | null;
    aGames: number;
    bGames: number;
    ties: number;
  }[];
}

export interface MatchExplorerRow {
  matchId: string;
  eventId: string;
  eventName: string;
  startsAt: string;
  storeName: string | null;
  roundNumber: number;
  tableNumber: number | null;
  team1: {
    playerId: string | null;
    displayName: string | null;
    outcome: string | null;
    gamesWon: number;
  };
  team2: {
    playerId: string | null;
    displayName: string | null;
    outcome: string | null;
    gamesWon: number;
  };
  ties: number;
  games: number;
}

export interface MatchesResponse {
  matches: MatchExplorerRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface StoreSummary {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  eventCount: number;
  liveEvents: number;
  lastEventAt: string | null;
}

export interface StoresResponse {
  stores: StoreSummary[];
}

export interface StoreClashSeason {
  slug: string;
  name: string;
  startsOn: string;
  weeks: number;
  bestWeeks: number;
  finalsOn: string | null;
}

export interface StoreClashStanding {
  seasonSlug: string;
  seasonName: string;
  startsOn: string;
  weeks: number;
  bestWeeks: number;
  finalsOn: string | null;
  storeId: string;
  storeName: string;
  weekday: string | null;
  startTime: string | null;
  displayOrder: number | null;
  playerId: string | null;
  displayName: string | null;
  weeksPlayed: number | null;
  totalPoints: number | null;
  bestSixPoints: number | null;
  weeklyPoints: Record<string, number>;
  storeRank: number | null;
  qualified: boolean;
}

export interface StoreClashResponse {
  seasons: StoreClashSeason[];
  season: StoreClashSeason | null;
  standings: StoreClashStanding[];
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDate = (value: string | Date | null): string =>
  value ? DATE_FORMAT.format(new Date(value)) : '—';

export const formatDateTime = (value: string | Date | null): string =>
  value ? DATE_TIME_FORMAT.format(new Date(value)) : '—';

// Date-only columns (season starts/finals) must not shift a day through a
// timezone conversion.
export const formatDateOnly = (value: string | Date | null): string => {
  if (!value) return '—';
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
};

export const formatSigned = (value: number | null): string => {
  if (value == null) return '—';
  return value > 0 ? `+${value}` : String(value);
};

export const formatPercent = (value: number | null): string =>
  value == null ? '—' : `${(value * 100).toFixed(1)}%`;

export const formatRecord = (
  wins: number | null,
  losses: number | null,
  draws: number | null,
): string =>
  wins == null && losses == null && draws == null
    ? '—'
    : `${wins ?? 0}-${losses ?? 0}-${draws ?? 0}`;

export const shortPlayerId = (playerId: string): string =>
  playerId.slice(-6);

export type NormalizedOutcome = 'WIN' | 'LOSS' | 'DRAW' | null;

export const normalizeOutcome = (
  outcome: string | null | undefined,
): NormalizedOutcome => {
  if (!outcome) return null;
  if (outcome === 'WIN') return 'WIN';
  if (outcome === 'LOSS') return 'LOSS';
  if (outcome === 'DRAW' || outcome === 'TIE') return 'DRAW';
  return null;
};

export const outcomeLetter = (outcome: string | null): string => {
  const normalized = normalizeOutcome(outcome);
  if (normalized === 'WIN') return 'W';
  if (normalized === 'LOSS') return 'L';
  if (normalized === 'DRAW') return 'D';
  return '—';
};

export const parseWeeklyPoints = (
  value: unknown,
): Record<string, number> => {
  if (!value) return {};
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (typeof parsed !== 'object') return {};
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([week, points]) => [
      String(week),
      Number(points),
    ]),
  );
};

export const eventTypeLabel = (type: string | null): string => {
  if (!type) return 'Event';
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
