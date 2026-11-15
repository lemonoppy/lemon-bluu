import { ResultAsync } from 'neverthrow';

import Query from 'src/lib/db';
import { DatabaseError } from 'src/lib/errors';

export interface StoreClashSeason {
  id: number;
  slug: string;
  name: string;
  starts_on: Date | string;
  weeks: number;
  best_weeks: number;
  finals_on: Date | string | null;
}

export interface StoreClashStanding {
  season_slug: string;
  season_name: string;
  starts_on: Date | string;
  weeks: number;
  best_weeks: number;
  finals_on: Date | string | null;
  store_id: string;
  store_name: string;
  weekday: string | null;
  start_time: string | null;
  display_order: number | null;
  player_id: string | null;
  display_name: string | null;
  weeks_played: number | null;
  total_points: number | null;
  best_six_points: number | null;
  weekly_points: Record<string, number> | string | null;
  store_rank: number | null;
  qualified: boolean;
}

export const getStoreClashSeasons = (): ResultAsync<
  StoreClashSeason[],
  DatabaseError
> =>
  Query<StoreClashSeason>(
    `SELECT id, slug, name, starts_on, weeks, best_weeks, finals_on
     FROM store_clash_seasons
     ORDER BY starts_on DESC`,
  ).map((result) => result.rows);

export const getCurrentStoreClashSeason = (): ResultAsync<
  StoreClashSeason | null,
  DatabaseError
> =>
  Query<StoreClashSeason>(
    `SELECT id, slug, name, starts_on, weeks, best_weeks, finals_on
     FROM store_clash_seasons
     WHERE CURRENT_DATE BETWEEN starts_on AND starts_on + (weeks * 7 - 1)
     ORDER BY starts_on DESC
     LIMIT 1`,
  ).map((result) => result.rows[0] ?? null);

export const getStoreClashStandings = (
  slug: string,
): ResultAsync<StoreClashStanding[], DatabaseError> =>
  Query<StoreClashStanding>(
    'SELECT * FROM store_clash_standings($1)',
    [slug],
  ).map((result) => result.rows);

export const getStoreClashStores = (
  slug: string,
): ResultAsync<{ store_id: string; store_name: string }[], DatabaseError> =>
  Query<{ store_id: string; store_name: string }>(
    `SELECT DISTINCT store_id, store_name
     FROM store_clash_standings($1)
     ORDER BY store_name`,
    [slug],
  ).map((result) => result.rows);

export const parseWeeklyPoints = (
  value: StoreClashStanding['weekly_points'],
): Record<number, number> => {
  if (!value) return {};
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return Object.fromEntries(
    Object.entries(parsed as Record<string, number>).map(([week, points]) => [
      Number(week),
      Number(points),
    ]),
  );
};
