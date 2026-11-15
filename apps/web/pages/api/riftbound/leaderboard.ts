import Query from '@/lib/db';
import type { LeaderboardPlayer, LeaderboardStats } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface PlayerRow {
  player_id: string;
  display_name: string;
  tag_line: string | null;
  eloshowdown_player_id: number | null;
  current_elo: number | null;
  is_squad: boolean;
  community_eligible: boolean;
  local_events: number;
  last_event_at: Date | null;
  rank: number | null;
}

interface StatsRow {
  events: number;
  completed_events: number;
  live_events: number;
  players: number;
  matches: number;
  games: number;
  stores: number;
  last_completed_at: Date | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [playersResult, statsResult] = await Promise.all([
    Query<PlayerRow>(
      `WITH local AS (
         SELECT ep.player_id,
                (array_agg(ep.display_name ORDER BY e.starts_at DESC))[1] AS display_name,
                (array_agg(ep.tag_line ORDER BY e.starts_at DESC))[1] AS tag_line,
                max(ep.eloshowdown_player_id) AS eloshowdown_player_id,
                count(DISTINCT ep.event_id)::int AS local_events,
                max(COALESCE(e.ends_at, e.starts_at)) AS last_event_at,
                count(DISTINCT ep.event_id) FILTER (
                  WHERE e.status = 'COMPLETED'
                )::int AS completed_events,
                max(CASE WHEN e.status = 'COMPLETED'
                         THEN COALESCE(e.ends_at, e.starts_at) END) AS last_completed_event
         FROM rb_event_participants ep
         JOIN rb_events e ON e.id = ep.event_id
         WHERE e.is_local AND e.status IS NOT NULL
         GROUP BY ep.player_id
       ),
       joined AS (
         SELECT l.*, p.current_elo,
                (COALESCE(p.is_squad, false) OR EXISTS (
                  SELECT 1 FROM eloshowdown_players s
                  WHERE s.is_squad AND lower(s.display_name) = lower(l.display_name)
                )) AS is_squad
         FROM local l
         LEFT JOIN eloshowdown_players p ON p.player_id = l.eloshowdown_player_id
       )
       SELECT player_id, display_name, tag_line, eloshowdown_player_id,
              current_elo, is_squad,
              (is_squad
               OR (completed_events >= $1
                   AND last_completed_event >= now() - make_interval(days => $2::int))
              ) AS community_eligible,
              local_events, last_event_at,
              CASE WHEN current_elo IS NULL THEN NULL
                   ELSE RANK() OVER (ORDER BY current_elo DESC NULLS LAST)::int END AS rank
       FROM joined
       ORDER BY current_elo DESC NULLS LAST, local_events DESC, display_name ASC`,
      [3, 30],
    ),
    Query<StatsRow>(
      `SELECT
         (SELECT count(*) FROM rb_events WHERE is_local AND status IS NOT NULL)::int AS events,
         (SELECT count(*) FROM rb_events WHERE is_local AND status = 'COMPLETED')::int AS completed_events,
         (SELECT count(*) FROM rb_events WHERE is_local AND status = 'IN_PROGRESS')::int AS live_events,
         (SELECT count(DISTINCT ep.player_id)
            FROM rb_event_participants ep JOIN rb_events e ON e.id = ep.event_id
           WHERE e.is_local AND e.status IS NOT NULL)::int AS players,
         (SELECT count(*) FROM rb_matches m JOIN rb_events e ON e.id = m.event_id
           WHERE e.is_local AND e.status IS NOT NULL)::int AS matches,
         (SELECT count(*) FROM rb_games g
            JOIN rb_matches m ON m.esports_match_id = g.esports_match_id
            JOIN rb_events e ON e.id = m.event_id
           WHERE e.is_local AND e.status IS NOT NULL)::int AS games,
         (SELECT count(DISTINCT e.store_id) FROM rb_events e
           WHERE e.is_local AND e.status IS NOT NULL AND e.store_id IS NOT NULL)::int AS stores,
         (SELECT max(e.starts_at) FROM rb_events e
           WHERE e.is_local AND e.status = 'COMPLETED') AS last_completed_at`,
    ),
  ]);

  if (playersResult.isErr() || statsResult.isErr()) {
    console.error(
      '[riftbound leaderboard] DB error:',
      playersResult.isErr()
        ? playersResult.error
        : statsResult.isErr()
          ? statsResult.error
          : null,
    );
    return res.status(500).json({ error: 'Database error' });
  }

  const rows = playersResult.value.rows;
  const statsRow = statsResult.value.rows[0];
  const players: LeaderboardPlayer[] = rows.map((row) => ({
    playerId: row.player_id,
    displayName: row.display_name,
    tagLine: row.tag_line,
    eloshowdownPlayerId: row.eloshowdown_player_id,
    currentElo: row.current_elo,
    isSquad: row.is_squad,
    communityEligible: row.community_eligible,
    localEvents: row.local_events,
    lastEventAt: row.last_event_at?.toISOString() ?? null,
    rank: row.rank,
  }));

  const stats: LeaderboardStats = {
    events: statsRow.events,
    completedEvents: statsRow.completed_events,
    liveEvents: statsRow.live_events,
    players: statsRow.players,
    linkedPlayers: players.filter(
      (player) => player.eloshowdownPlayerId != null,
    ).length,
    matches: statsRow.matches,
    games: statsRow.games,
    stores: statsRow.stores,
    lastCompletedAt: statsRow.last_completed_at?.toISOString() ?? null,
  };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400',
  );
  return res.status(200).json({ stats, players });
}
