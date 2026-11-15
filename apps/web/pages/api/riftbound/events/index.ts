import Query from '@/lib/db';
import type { EventSummary } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface EventRow {
  id: string;
  name: string;
  starts_at: Date;
  ends_at: Date | null;
  status: string;
  tournament_type: string | null;
  structure: string | null;
  round_count: number | null;
  top_cut: number | null;
  store_id: string | null;
  store_name: string | null;
  player_count: number;
  match_count: number;
  winner_name: string | null;
  winner_player_id: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await Query<EventRow>(
    `SELECT e.id, e.name, e.starts_at, e.ends_at, e.status, e.tournament_type,
            e.structure, e.round_count, e.top_cut,
            s.id AS store_id, s.name AS store_name,
            (SELECT count(*) FROM rb_event_participants ep
              WHERE ep.event_id = e.id)::int AS player_count,
            (SELECT count(*) FROM rb_matches m
              WHERE m.event_id = e.id)::int AS match_count,
            w.display_name AS winner_name, w.player_id AS winner_player_id
     FROM rb_events e
     LEFT JOIN rb_stores s ON s.id = e.store_id
     LEFT JOIN LATERAL (
       SELECT ep.display_name, ep.player_id
       FROM rb_event_participants ep
       WHERE ep.event_id = e.id AND ep.final_rank = 1
       LIMIT 1
     ) w ON true
     WHERE e.is_local AND e.status IS NOT NULL
     ORDER BY (e.status = 'IN_PROGRESS') DESC, e.starts_at DESC`,
  );

  if (result.isErr()) {
    console.error('[riftbound events] DB error:', result.error);
    return res.status(500).json({ error: 'Database error' });
  }

  const events: EventSummary[] = result.value.rows.map((row) => ({
    id: row.id,
    name: row.name,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at?.toISOString() ?? null,
    status: row.status,
    tournamentType: row.tournament_type,
    structure: row.structure,
    roundCount: row.round_count,
    topCut: row.top_cut,
    storeId: row.store_id,
    storeName: row.store_name,
    playerCount: row.player_count,
    matchCount: row.match_count,
    winnerName: row.winner_name,
    winnerPlayerId: row.winner_player_id,
  }));

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300',
  );
  return res.status(200).json({ events });
}
