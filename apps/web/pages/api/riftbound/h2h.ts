import Query from '@/lib/db';
import type { H2HResponse } from '@/lib/riftbound';
import { normalizeOutcome } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface NameRow {
  player_id: string;
  display_name: string;
}

interface H2HRow {
  match_id: string;
  round_number: number;
  table_number: number | null;
  event_id: string;
  event_name: string;
  starts_at: Date;
  a_outcome: string | null;
  b_outcome: string | null;
  a_games: number;
  b_games: number;
  ties: number;
}

const isPlayerId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-zA-Z-]{1,64}$/.test(value);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const playerA = req.query.playerA;
  const playerB = req.query.playerB;
  if (!isPlayerId(playerA) || !isPlayerId(playerB) || playerA === playerB) {
    return res.status(400).json({ error: 'Invalid players' });
  }

  const [namesResult, matchesResult] = await Promise.all([
    Query<NameRow>(
      `SELECT ep.player_id,
              (array_agg(ep.display_name ORDER BY e.starts_at DESC))[1] AS display_name
       FROM rb_event_participants ep
       JOIN rb_events e ON e.id = ep.event_id
       WHERE ep.player_id = ANY($1::text[])
       GROUP BY ep.player_id`,
      [[playerA, playerB]],
    ),
    Query<H2HRow>(
      `WITH a AS (
         SELECT event_id, esports_team_id
         FROM rb_event_participants WHERE player_id = $1
       ),
       b AS (
         SELECT event_id, esports_team_id
         FROM rb_event_participants WHERE player_id = $2
       )
       SELECT m.esports_match_id AS match_id, m.round_number, m.table_number,
              e.id AS event_id, e.name AS event_name, e.starts_at,
              CASE WHEN m.team1_id = a.esports_team_id
                   THEN m.team1_outcome ELSE m.team2_outcome END AS a_outcome,
              CASE WHEN m.team1_id = b.esports_team_id
                   THEN m.team1_outcome ELSE m.team2_outcome END AS b_outcome,
              CASE WHEN m.team1_id = a.esports_team_id
                   THEN g.t1_wins ELSE g.t2_wins END AS a_games,
              CASE WHEN m.team1_id = b.esports_team_id
                   THEN g.t1_wins ELSE g.t2_wins END AS b_games,
              g.ties
       FROM rb_matches m
       JOIN rb_events e ON e.id = m.event_id
       JOIN a ON a.event_id = m.event_id
             AND (m.team1_id = a.esports_team_id OR m.team2_id = a.esports_team_id)
       JOIN b ON b.event_id = m.event_id
             AND (m.team1_id = b.esports_team_id OR m.team2_id = b.esports_team_id)
       LEFT JOIN LATERAL (
         SELECT count(*) FILTER (WHERE x.team1_outcome = 'WIN')::int AS t1_wins,
                count(*) FILTER (WHERE x.team2_outcome = 'WIN')::int AS t2_wins,
                count(*) FILTER (WHERE x.team1_outcome IN ('TIE', 'DRAW'))::int AS ties
         FROM rb_games x
         WHERE x.esports_match_id = m.esports_match_id
       ) g ON true
       WHERE (m.team1_id = a.esports_team_id AND m.team2_id = b.esports_team_id)
          OR (m.team2_id = a.esports_team_id AND m.team1_id = b.esports_team_id)
       ORDER BY e.starts_at DESC, m.round_number DESC`,
      [playerA, playerB],
    ),
  ]);

  if (namesResult.isErr() || matchesResult.isErr()) {
    console.error(
      '[riftbound h2h] DB error:',
      namesResult.isErr()
        ? namesResult.error
        : matchesResult.isErr()
          ? matchesResult.error
          : null,
    );
    return res.status(500).json({ error: 'Database error' });
  }

  const names = new Map(
    namesResult.value.rows.map((row) => [row.player_id, row.display_name]),
  );
  const nameA = names.get(playerA);
  const nameB = names.get(playerB);
  if (!nameA || !nameB) {
    return res.status(404).json({ error: 'Player not found' });
  }

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  for (const row of matchesResult.value.rows) {
    const outcomeA = normalizeOutcome(row.a_outcome);
    const outcomeB = normalizeOutcome(row.b_outcome);
    if (outcomeA === 'WIN' || outcomeB === 'LOSS') winsA++;
    else if (outcomeB === 'WIN' || outcomeA === 'LOSS') winsB++;
    else if (outcomeA === 'DRAW' || outcomeB === 'DRAW') draws++;
  }

  const response: H2HResponse = {
    playerA: { playerId: playerA, displayName: nameA, wins: winsA },
    playerB: { playerId: playerB, displayName: nameB, wins: winsB },
    draws,
    matches: matchesResult.value.rows.map((row) => ({
      matchId: row.match_id,
      eventId: row.event_id,
      eventName: row.event_name,
      startsAt: row.starts_at.toISOString(),
      roundNumber: row.round_number,
      tableNumber: row.table_number,
      aOutcome: row.a_outcome,
      bOutcome: row.b_outcome,
      aGames: row.a_games,
      bGames: row.b_games,
      ties: row.ties,
    })),
  };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=3600',
  );
  return res.status(200).json(response);
}
