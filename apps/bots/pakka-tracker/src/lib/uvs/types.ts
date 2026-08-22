export interface UVSDeckDefiningCard {
  id: string;
  name: string;
  image_url: string | null;
}

export interface UVSUser {
  id: number;
  pronouns: string | null;
  country_code: string | null;
}

export interface UVSPlayer {
  id: number;
  best_identifier: string;
}

export interface UVSUserEventStatus {
  id: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  total_match_points: number;
  full_profile_picture_url: string | null;
  registration_status: string;
  best_identifier: string;
  is_guest: boolean;
  user: UVSUser;
  deck_defining_card: UVSDeckDefiningCard | null;
}

export interface UVSRoundResultItem {
  id: number;
  player: UVSPlayer;
  user_event_status: UVSUserEventStatus;
  round_number: number;
  rank: number;
  record: string;
  match_record: string;
  match_points: number;
  opponent_match_win_percentage: number;
  game_win_percentage: number;
  opponent_game_win_percentage: number;
  points: number;
}

export interface UVSRoundStandingsPaginatedResponse {
  page_size: number;
  count: number;
  total: number;
  current_page_number: number;
  next: string | null;
  results: UVSRoundResultItem[];
}

export interface UVSTournamentRound {
  id: number;
  round_number: number;
  final_round_in_event: boolean;
  pairings_status: 'GENERATED' | 'NOT_GENERATED';
  standings_status: 'GENERATED' | 'NOT_GENERATED';
  round_type: string;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'UPCOMING';
}

export interface UVSTournamentPhase {
  id: number;
  phase_name: string;
  status: string;
  order_in_phases: number;
  number_of_rounds: number | null;
  round_type: string;
  rank_required_to_enter_phase: number | null;
  rounds: UVSTournamentRound[];
}

export interface UVSEventData {
  id: number;
  start_datetime: string;
  end_datetime: string;
  timer_is_running: boolean;
  timer_end_datetime: string;
  name: string;
  store: { id: number; name: string };
  tournament_phases: UVSTournamentPhase[];
}

export interface UVSResultData {
  rank: string;
  username: string;
  legend: string;
  points: number;
  record: string;
  omw: number;
  gw: number;
  ogw: number;
  status: string;
}

export interface ScrapeResult {
  players: UVSResultData[];
  event: UVSEventData;
  currentRound: number;
  displayRound: number;
  totalRounds: number;
  roundsRemaining: number;
  isComplete: boolean;
  isCutDecided: boolean;
  latestRoundStatus: string;
  phaseName: string;
  isDay2: boolean;
  isElimination: boolean;
  isCuttingPhase: boolean;
  totalSwissRounds: number;
  topCutSize: number;
  activePhase: UVSTournamentPhase;
  allPhases: UVSTournamentPhase[];
}
