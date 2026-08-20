export interface EloShowdownPlayer {
  id: number;
  display_name: string;
  riftbound_id: string | null;
  is_anonymous: boolean;
  primary_community: string | null;
  primary_community_slug: string | null;
  country: string | null;
  lifetime_total_matches: number;
  lifetime_wins: number;
  lifetime_losses: number;
  lifetime_draws: number;
}

export interface EloHistoryPoint {
  date: string;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  match_id: number;
  opponent_id: number;
  opponent_name: string;
  result: string;
}

export interface EloHistoryResponse {
  season_slug: string;
  points: EloHistoryPoint[];
}

export interface EloShowdownSeason {
  slug: string;
  name: string;
  start: string;
  end: string | null;
  is_current: boolean;
}
