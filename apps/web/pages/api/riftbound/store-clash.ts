import Query from '@/lib/db';
import type {
  StoreClashResponse,
  StoreClashSeason,
  StoreClashStanding,
} from '@/lib/riftbound';
import { parseWeeklyPoints } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface SeasonRow {
  slug: string;
  name: string;
  starts_on: Date | string;
  weeks: number;
  best_weeks: number;
  finals_on: Date | string | null;
}

interface StandingRow {
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
  weekly_points: unknown;
  store_rank: number | null;
  qualified: boolean;
}

const toDateOnly = (value: Date | string | null): string | null => {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
};

const toSeason = (row: SeasonRow): StoreClashSeason => ({
  slug: row.slug,
  name: row.name,
  startsOn: toDateOnly(row.starts_on) ?? '',
  weeks: row.weeks,
  bestWeeks: row.best_weeks,
  finalsOn: toDateOnly(row.finals_on),
});

const torontoToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const addDays = (dateOnly: string, days: number): string => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const seasonsResult = await Query<SeasonRow>(
    `SELECT slug, name, starts_on, weeks, best_weeks, finals_on
     FROM store_clash_seasons
     ORDER BY starts_on DESC`,
  );
  if (seasonsResult.isErr()) {
    console.error('[riftbound store-clash] seasons error:', seasonsResult.error);
    return res.status(500).json({ error: 'Database error' });
  }

  const seasons = seasonsResult.value.rows.map(toSeason);
  if (seasons.length === 0) {
    const empty: StoreClashResponse = { seasons: [], season: null, standings: [] };
    return res.status(200).json(empty);
  }

  const requested =
    typeof req.query.season === 'string' ? req.query.season : null;
  const today = torontoToday();
  const active = seasons.find(
    (season) =>
      season.startsOn <= today &&
      today <= addDays(season.startsOn, season.weeks * 7 - 1),
  );
  const selected = requested
    ? seasons.find((season) => season.slug === requested)
    : (active ?? seasons[0]);

  if (!selected) {
    return res.status(404).json({ error: 'Season not found' });
  }

  const standingsResult = await Query<StandingRow>(
    'SELECT * FROM store_clash_standings($1)',
    [selected.slug],
  );
  if (standingsResult.isErr()) {
    console.error(
      '[riftbound store-clash] standings error:',
      standingsResult.error,
    );
    return res.status(500).json({ error: 'Database error' });
  }

  const standings: StoreClashStanding[] = standingsResult.value.rows.map(
    (row) => ({
      seasonSlug: row.season_slug,
      seasonName: row.season_name,
      startsOn: toDateOnly(row.starts_on) ?? '',
      weeks: row.weeks,
      bestWeeks: row.best_weeks,
      finalsOn: toDateOnly(row.finals_on),
      storeId: row.store_id,
      storeName: row.store_name,
      weekday: row.weekday,
      startTime: row.start_time,
      displayOrder: row.display_order,
      playerId: row.player_id,
      displayName: row.display_name,
      weeksPlayed: row.weeks_played,
      totalPoints: row.total_points,
      bestSixPoints: row.best_six_points,
      weeklyPoints: parseWeeklyPoints(row.weekly_points),
      storeRank: row.store_rank,
      qualified: row.qualified,
    }),
  );

  const response: StoreClashResponse = {
    seasons,
    season: selected,
    standings,
  };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300',
  );
  return res.status(200).json(response);
}
