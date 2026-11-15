import Query from '@/lib/db';
import type {
  EventDetailResponse,
  EventMatch,
  EventRound,
  EventStanding,
  LocationJson,
} from '@/lib/riftbound';

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
  location: LocationJson | null;
  last_fetched_at: Date | null;
  platform_updated_at: Date | null;
  store_id: string | null;
  store_name: string | null;
  store_address: LocationJson | null;
}

interface StandingRow {
  rank: number | null;
  player_id: string;
  display_name: string;
  tag_line: string | null;
  status: string | null;
  match_points: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  omw: number | null;
  gw: number | null;
  ogw: number | null;
  elo_before: number | null;
  elo_after: number | null;
  elo_change: number | null;
  standings_round: number | null;
}

interface RoundRow {
  round_number: number;
  stage_id: string | null;
  section_type: string | null;
  status: string | null;
  started_at: Date | null;
  duration_min: number | null;
  bye_team_ids: string[] | null;
}

interface MatchRow {
  match_id: string;
  round_number: number;
  table_number: number | null;
  strategy: string | null;
  team1_id: string | null;
  team1_name: string | null;
  team1_player_id: string | null;
  team1_outcome: string | null;
  team2_id: string | null;
  team2_name: string | null;
  team2_player_id: string | null;
  team2_outcome: string | null;
  t1_wins: number;
  t2_wins: number;
  ties: number;
  games: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string' || !/^\d{1,20}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }

  const [eventResult, standingsResult, roundsResult, matchesResult] =
    await Promise.all([
      Query<EventRow>(
        `SELECT e.id, e.name, e.starts_at, e.ends_at, e.status,
                e.tournament_type, e.structure, e.round_count, e.top_cut,
                e.location, e.last_fetched_at, e.platform_updated_at,
                s.id AS store_id, s.name AS store_name,
                s.address AS store_address
         FROM rb_events e
         LEFT JOIN rb_stores s ON s.id = e.store_id
         WHERE e.id = $1`,
        [id],
      ),
      Query<StandingRow>(
        `WITH latest AS (
           SELECT max(round_number) AS round_number
           FROM rb_standings WHERE event_id = $1
         )
         SELECT COALESCE(s.rank, ep.final_rank) AS rank,
                ep.player_id, ep.display_name, ep.tag_line, ep.status,
                COALESCE(s.match_points, ep.points) AS match_points,
                COALESCE(s.wins, ep.wins) AS wins,
                COALESCE(s.losses, ep.losses) AS losses,
                COALESCE(s.draws, ep.draws) AS draws,
                s.omw::float8 AS omw,
                s.gw::float8 AS gw,
                s.ogw::float8 AS ogw,
                ep.elo_before, ep.elo_after, ep.elo_change,
                l.round_number AS standings_round
         FROM rb_event_participants ep
         LEFT JOIN latest l ON true
         LEFT JOIN rb_standings s
           ON s.event_id = ep.event_id
          AND s.esports_team_id = ep.esports_team_id
          AND s.round_number = l.round_number
         WHERE ep.event_id = $1
         ORDER BY rank NULLS LAST, ep.display_name ASC`,
        [id],
      ),
      Query<RoundRow>(
        `SELECT round_number, stage_id, section_type, status, started_at,
                duration_min, bye_team_ids
         FROM rb_rounds
         WHERE event_id = $1
         ORDER BY round_number ASC`,
        [id],
      ),
      Query<MatchRow>(
        `SELECT m.esports_match_id AS match_id, m.round_number,
                m.table_number, m.strategy,
                m.team1_id, p1.display_name AS team1_name,
                p1.player_id AS team1_player_id,
                m.team1_outcome,
                m.team2_id, p2.display_name AS team2_name,
                p2.player_id AS team2_player_id,
                m.team2_outcome,
                g.t1_wins, g.t2_wins, g.ties, g.games
         FROM rb_matches m
         LEFT JOIN rb_event_participants p1
           ON p1.event_id = m.event_id AND p1.esports_team_id = m.team1_id
         LEFT JOIN rb_event_participants p2
           ON p2.event_id = m.event_id AND p2.esports_team_id = m.team2_id
         LEFT JOIN LATERAL (
           SELECT count(*) FILTER (WHERE x.team1_outcome = 'WIN')::int AS t1_wins,
                  count(*) FILTER (WHERE x.team2_outcome = 'WIN')::int AS t2_wins,
                  count(*) FILTER (WHERE x.team1_outcome IN ('TIE', 'DRAW'))::int AS ties,
                  count(*)::int AS games
           FROM rb_games x
           WHERE x.esports_match_id = m.esports_match_id
         ) g ON true
         WHERE m.event_id = $1
         ORDER BY m.round_number ASC, m.table_number ASC NULLS LAST`,
        [id],
      ),
    ]);

  if (
    eventResult.isErr() ||
    standingsResult.isErr() ||
    roundsResult.isErr() ||
    matchesResult.isErr()
  ) {
    console.error(
      '[riftbound event] DB error:',
      eventResult.isErr()
        ? eventResult.error
        : standingsResult.isErr()
          ? standingsResult.error
          : roundsResult.isErr()
            ? roundsResult.error
            : matchesResult.isErr()
              ? matchesResult.error
              : null,
    );
    return res.status(500).json({ error: 'Database error' });
  }

  const event = eventResult.value.rows[0];
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const standings: EventStanding[] = standingsResult.value.rows.map((row) => ({
    rank: row.rank,
    playerId: row.player_id,
    displayName: row.display_name,
    tagLine: row.tag_line,
    status: row.status,
    matchPoints: row.match_points,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    omw: row.omw,
    gw: row.gw,
    ogw: row.ogw,
    eloBefore: row.elo_before,
    eloAfter: row.elo_after,
    eloChange: row.elo_change,
  }));

  const rounds: EventRound[] = roundsResult.value.rows.map((row) => ({
    roundNumber: row.round_number,
    stageId: row.stage_id,
    sectionType: row.section_type,
    status: row.status,
    startedAt: row.started_at?.toISOString() ?? null,
    durationMin: row.duration_min,
    byeTeamIds: row.bye_team_ids ?? [],
  }));

  const matches: EventMatch[] = matchesResult.value.rows.map((row) => {
    const final = row.team1_outcome != null || row.team2_outcome != null;
    const state = final
      ? 'final'
      : event.status === 'IN_PROGRESS' && row.games > 0
        ? 'in_progress'
        : 'pending';
    return {
      matchId: row.match_id,
      roundNumber: row.round_number,
      tableNumber: row.table_number,
      strategy: row.strategy,
      state,
      team1: {
        teamId: row.team1_id,
        playerId: row.team1_player_id,
        displayName: row.team1_name,
        outcome: row.team1_outcome,
        gamesWon: row.t1_wins,
      },
      team2: {
        teamId: row.team2_id,
        playerId: row.team2_player_id,
        displayName: row.team2_name,
        outcome: row.team2_outcome,
        gamesWon: row.t2_wins,
      },
      ties: row.ties,
      games: row.games,
    };
  });

  const response: EventDetailResponse = {
    event: {
      id: event.id,
      name: event.name,
      startsAt: event.starts_at.toISOString(),
      endsAt: event.ends_at?.toISOString() ?? null,
      status: event.status,
      tournamentType: event.tournament_type,
      structure: event.structure,
      roundCount: event.round_count,
      topCut: event.top_cut,
      lastFetchedAt: event.last_fetched_at?.toISOString() ?? null,
      platformUpdatedAt: event.platform_updated_at?.toISOString() ?? null,
      location: event.location,
      store: event.store_id
        ? {
            id: event.store_id,
            name: event.store_name ?? 'Unknown store',
            address: event.store_address,
          }
        : null,
    },
    standingsRound: standingsResult.value.rows[0]?.standings_round ?? null,
    standings,
    rounds,
    matches,
  };

  const cacheSeconds = event.status === 'IN_PROGRESS' ? 60 : 300;
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`,
  );
  return res.status(200).json(response);
}
