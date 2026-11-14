import { ResultAsync } from 'neverthrow';

import { Config } from 'src/lib/config/config';
import Query from 'src/lib/db';
import { DatabaseError } from 'src/lib/errors';

export interface PlayerRow {
  player_id: number;
  display_name: string;
  current_elo: number | null;
}

export interface PlayerRecentEventRow {
  start_datetime: Date;
  name: string;
  elo_after: number | null;
  elo_change: number | null;
}

export interface OttawaLeaderboardRow {
  player_id: number;
  display_name: string;
  current_elo: number | null;
  ottawa_events: number;
  last_event: Date | null;
}

export const getPlayerRow = (
  playerId: number,
): ResultAsync<PlayerRow | null, DatabaseError> =>
  Query<PlayerRow>(
    `SELECT player_id, display_name, current_elo
     FROM eloshowdown_players
     WHERE player_id = $1`,
    [playerId],
  ).map((result) => result.rows[0] ?? null);

export const getPlayerRecentEvents = (
  playerId: number,
  limit = 5,
): ResultAsync<PlayerRecentEventRow[], DatabaseError> =>
  Query<PlayerRecentEventRow>(
    `SELECT e.starts_at AS start_datetime, e.name, ep.elo_after, ep.elo_change
     FROM rb_event_participants ep
     JOIN rb_events e ON e.id = ep.event_id
     WHERE ep.eloshowdown_player_id = $1
       AND ep.elo_change IS NOT NULL
       AND e.status = 'COMPLETED'
     ORDER BY e.starts_at DESC
     LIMIT $2`,
    [playerId, limit],
  ).map((result) => result.rows);

export const getOttawaLeaderboard = (
  limit: number | null,
): ResultAsync<OttawaLeaderboardRow[], DatabaseError> => {
  const params: unknown[] = [
    Config.ottawaCommunityMinEvents,
    Config.ottawaRecentWindowDays,
  ];
  const limitClause = limit != null ? ` LIMIT $${params.length + 1}` : '';
  if (limit != null) params.push(limit);
  return Query<OttawaLeaderboardRow>(
    `SELECT p.player_id,
            p.display_name,
            p.current_elo,
            COUNT(ep.event_id)::int AS ottawa_events,
            MAX(COALESCE(e.ends_at, e.starts_at)) AS last_event
     FROM rb_event_participants ep
     JOIN eloshowdown_players p ON p.player_id = ep.eloshowdown_player_id
     JOIN rb_events e ON e.id = ep.event_id
     WHERE e.is_local
       AND e.status = 'COMPLETED'
       AND ep.final_rank IS NOT NULL
     GROUP BY p.player_id, p.display_name, p.current_elo, p.is_squad
     HAVING p.is_squad
         OR (
           COUNT(ep.event_id) >= $1
           AND MAX(COALESCE(e.ends_at, e.starts_at)) >=
               now() - make_interval(days => $2::int)
         )
     ORDER BY p.current_elo DESC NULLS LAST
     ${limitClause}`,
    params,
  ).map((result) => result.rows as OttawaLeaderboardRow[]);
};

export const getOttawaLeaderboardForPlayers = (
  playerIds: number[],
): ResultAsync<OttawaLeaderboardRow[], DatabaseError> =>
  Query<OttawaLeaderboardRow>(
    `SELECT p.player_id,
            p.display_name,
            p.current_elo,
            COUNT(e.id)::int AS ottawa_events,
            MAX(e.starts_at) AS last_event
     FROM eloshowdown_players p
     LEFT JOIN rb_event_participants ep
       ON ep.eloshowdown_player_id = p.player_id
      AND ep.final_rank IS NOT NULL
     LEFT JOIN rb_events e
       ON e.id = ep.event_id
      AND e.is_local
      AND e.status = 'COMPLETED'
     WHERE p.player_id = ANY($1::int[])
     GROUP BY p.player_id, p.display_name, p.current_elo`,
    [playerIds],
  ).map((result) => result.rows as OttawaLeaderboardRow[]);
