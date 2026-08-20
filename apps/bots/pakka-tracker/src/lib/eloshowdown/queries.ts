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
    `SELECT e.start_datetime, e.name, ep.elo_after, ep.elo_change
     FROM event_players ep
     JOIN ottawa_events e ON e.id = ep.event_id
     WHERE ep.player_id = $1 AND ep.elo_change IS NOT NULL
     ORDER BY e.start_datetime DESC
     LIMIT $2`,
    [playerId, limit],
  ).map((result) => result.rows);

export const getOttawaLeaderboard = (
  limit: number,
): ResultAsync<OttawaLeaderboardRow[], DatabaseError> =>
  Query<OttawaLeaderboardRow>(
    `SELECT p.player_id,
            p.display_name,
            p.current_elo,
            COUNT(ep.event_id)::int AS ottawa_events,
            MAX(e.start_datetime) AS last_event
     FROM event_players ep
     JOIN eloshowdown_players p ON p.player_id = ep.player_id
     JOIN ottawa_events e ON e.id = ep.event_id
     GROUP BY p.player_id, p.display_name, p.current_elo
     HAVING COUNT(ep.event_id) >= $1
     ORDER BY p.current_elo DESC NULLS LAST
     LIMIT $2`,
    [Config.ottawaCommunityMinEvents, limit],
  ).map((result) => result.rows as OttawaLeaderboardRow[]);
