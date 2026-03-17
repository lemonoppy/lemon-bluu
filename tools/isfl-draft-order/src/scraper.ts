import { Game, PlayoffGame, StandingsResponse, Team } from './types';
import { fetchJson, getSeasonUrl, getStandingsUrl } from './utils';

export async function fetchCurrentSeason(): Promise<number> {
  const data = await fetchJson<{ season: number }>(getSeasonUrl());
  return data.season;
}

export async function fetchStandingsData(season: number): Promise<{
  teams: Team[];
  games: Game[];
  postseason: PlayoffGame[];
}> {
  const data = await fetchJson<StandingsResponse>(getStandingsUrl(season));
  return {
    teams: data.regularSeason,
    games: data.games,
    postseason: data.postseason,
  };
}
