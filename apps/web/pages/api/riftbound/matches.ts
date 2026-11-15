import Query from '@/lib/db';
import type { MatchesResponse, MatchExplorerRow } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

const PAGE_SIZE = 50;

interface CountRow {
  total: number;
}

interface MatchRow {
  match_id: string;
  event_id: string;
  event_name: string;
  starts_at: Date;
  store_name: string | null;
  round_number: number;
  table_number: number | null;
  team1_player_id: string | null;
  team1_name: string | null;
  team1_outcome: string | null;
  team2_player_id: string | null;
  team2_name: string | null;
  team2_outcome: string | null;
  t1_wins: number;
  t2_wins: number;
  ties: number;
  games: number;
}

interface Where {
  clause: string;
  params: unknown[];
}

const buildWhere = (
  event: string | null,
  store: string | null,
  player: string | null,
): Where => {
  const conditions = ['e.is_local', 'e.status IS NOT NULL'];
  const params: unknown[] = [];
  if (event) {
    params.push(event);
    conditions.push(`m.event_id = $${params.length}`);
  }
  if (store) {
    params.push(store);
    conditions.push(`e.store_id = $${params.length}`);
  }
  if (player) {
    params.push(`%${player}%`);
    conditions.push(
      `(p1.display_name ILIKE $${params.length} OR p2.display_name ILIKE $${params.length})`,
    );
  }
  return { clause: conditions.join(' AND '), params };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawPage = req.query.page;
  if (
    rawPage !== undefined &&
    (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage))
  ) {
    return res.status(400).json({ error: 'Invalid page' });
  }
  const requestedPage = rawPage ? Number(rawPage) : 1;

  const event =
    typeof req.query.event === 'string' && req.query.event.trim()
      ? req.query.event.trim().slice(0, 64)
      : null;
  const store =
    typeof req.query.store === 'string' && req.query.store.trim()
      ? req.query.store.trim().slice(0, 64)
      : null;
  const player =
    typeof req.query.player === 'string' && req.query.player.trim()
      ? req.query.player.trim().slice(0, 100)
      : null;

  const where = buildWhere(event, store, player);
  const joins = `FROM rb_matches m
    JOIN rb_events e ON e.id = m.event_id
    LEFT JOIN rb_event_participants p1
      ON p1.event_id = m.event_id AND p1.esports_team_id = m.team1_id
    LEFT JOIN rb_event_participants p2
      ON p2.event_id = m.event_id AND p2.esports_team_id = m.team2_id`;

  const countResult = await Query<CountRow>(
    `SELECT count(*)::int AS total ${joins} WHERE ${where.clause}`,
    where.params,
  );
  if (countResult.isErr()) {
    console.error('[riftbound matches] count error:', countResult.error);
    return res.status(500).json({ error: 'Database error' });
  }

  const total = countResult.value.rows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const dataResult = await Query<MatchRow>(
    `SELECT m.esports_match_id AS match_id, m.round_number, m.table_number,
            e.id AS event_id, e.name AS event_name, e.starts_at,
            s.name AS store_name,
            p1.display_name AS team1_name,
            p1.player_id AS team1_player_id,
            m.team1_outcome,
            p2.display_name AS team2_name,
            p2.player_id AS team2_player_id,
            m.team2_outcome,
            g.t1_wins, g.t2_wins, g.ties, g.games
     ${joins}
     LEFT JOIN rb_stores s ON s.id = e.store_id
     LEFT JOIN LATERAL (
       SELECT count(*) FILTER (WHERE x.team1_outcome = 'WIN')::int AS t1_wins,
              count(*) FILTER (WHERE x.team2_outcome = 'WIN')::int AS t2_wins,
              count(*) FILTER (WHERE x.team1_outcome IN ('TIE', 'DRAW'))::int AS ties,
              count(*)::int AS games
       FROM rb_games x
       WHERE x.esports_match_id = m.esports_match_id
     ) g ON true
     WHERE ${where.clause}
     ORDER BY e.starts_at DESC, m.round_number DESC, m.table_number ASC NULLS LAST
     LIMIT $${where.params.length + 1} OFFSET $${where.params.length + 2}`,
    [...where.params, PAGE_SIZE, offset],
  );
  if (dataResult.isErr()) {
    console.error('[riftbound matches] DB error:', dataResult.error);
    return res.status(500).json({ error: 'Database error' });
  }

  const matches: MatchExplorerRow[] = dataResult.value.rows.map((row) => ({
    matchId: row.match_id,
    eventId: row.event_id,
    eventName: row.event_name,
    startsAt: row.starts_at.toISOString(),
    storeName: row.store_name,
    roundNumber: row.round_number,
    tableNumber: row.table_number,
    team1: {
      playerId: row.team1_player_id,
      displayName: row.team1_name,
      outcome: row.team1_outcome,
      gamesWon: row.t1_wins,
    },
    team2: {
      playerId: row.team2_player_id,
      displayName: row.team2_name,
      outcome: row.team2_outcome,
      gamesWon: row.t2_wins,
    },
    ties: row.ties,
    games: row.games,
  }));

  const response: MatchesResponse = {
    matches,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
    },
  };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300',
  );
  return res.status(200).json(response);
}
