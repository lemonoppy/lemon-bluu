import Query from '@/lib/db';
import type {
  EloHistoryPoint,
  PlayerEventRow,
  PlayerMatchRow,
  PlayerMatchup,
  PlayerProfileResponse,
} from '@/lib/riftbound';
import { normalizeOutcome } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface EventRow {
  event_id: string;
  event_name: string;
  starts_at: Date;
  status: string;
  is_local: boolean;
  tournament_type: string | null;
  store_name: string | null;
  display_name: string;
  tag_line: string | null;
  eloshowdown_player_id: number | null;
  final_rank: number | null;
  record: string | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  elo_before: number | null;
  elo_after: number | null;
  elo_change: number | null;
}

interface MatchRow {
  match_id: string;
  round_number: number;
  table_number: number | null;
  event_id: string;
  event_name: string;
  starts_at: Date;
  opponent_player_id: string | null;
  opponent_name: string | null;
  outcome: string | null;
  games_won: number;
  games_lost: number;
  ties: number;
  games: number;
}

interface ByeRow {
  match_id: string;
  event_id: string;
  event_name: string;
  starts_at: Date;
  round_number: number;
}

interface EloHistoryRow {
  match_date: Date;
  elo_after: number;
  elo_change: number;
  opponent_name: string | null;
  result: string | null;
}

interface PlayerSummaryRow {
  player_id: number;
  current_elo: number | null;
  is_squad: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.query;
  if (
    !playerId ||
    typeof playerId !== 'string' ||
    !/^[0-9a-zA-Z-]{1,64}$/.test(playerId)
  ) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  const [eventsResult, matchesResult, byesResult, eloResult, summaryResult] =
    await Promise.all([
      Query<EventRow>(
        `SELECT ep.event_id, e.name AS event_name, e.starts_at, e.status,
                e.is_local, e.tournament_type, s.name AS store_name,
                ep.display_name, ep.tag_line, ep.eloshowdown_player_id,
                ep.final_rank, ep.record, ep.points,
                ep.wins, ep.losses, ep.draws,
                ep.elo_before, ep.elo_after, ep.elo_change
         FROM rb_event_participants ep
         JOIN rb_events e ON e.id = ep.event_id
         LEFT JOIN rb_stores s ON s.id = e.store_id
         WHERE ep.player_id = $1
         ORDER BY e.starts_at DESC`,
        [playerId],
      ),
      Query<MatchRow>(
        `SELECT m.esports_match_id AS match_id, m.round_number, m.table_number,
                e.id AS event_id, e.name AS event_name, e.starts_at,
                opp.player_id AS opponent_player_id,
                opp.display_name AS opponent_name,
                CASE WHEN m.team1_id = ep.esports_team_id
                     THEN m.team1_outcome ELSE m.team2_outcome END AS outcome,
                CASE WHEN m.team1_id = ep.esports_team_id
                     THEN g.t1_wins ELSE g.t2_wins END AS games_won,
                CASE WHEN m.team1_id = ep.esports_team_id
                     THEN g.t2_wins ELSE g.t1_wins END AS games_lost,
                g.ties, g.games
         FROM rb_event_participants ep
         JOIN rb_events e ON e.id = ep.event_id
         JOIN rb_matches m
           ON m.event_id = ep.event_id
          AND (m.team1_id = ep.esports_team_id OR m.team2_id = ep.esports_team_id)
         LEFT JOIN rb_event_participants opp
           ON opp.event_id = m.event_id
          AND opp.esports_team_id = CASE WHEN m.team1_id = ep.esports_team_id
                                         THEN m.team2_id ELSE m.team1_id END
         LEFT JOIN LATERAL (
           SELECT count(*) FILTER (WHERE x.team1_outcome = 'WIN')::int AS t1_wins,
                  count(*) FILTER (WHERE x.team2_outcome = 'WIN')::int AS t2_wins,
                  count(*) FILTER (WHERE x.team1_outcome IN ('TIE', 'DRAW'))::int AS ties,
                  count(*)::int AS games
           FROM rb_games x
           WHERE x.esports_match_id = m.esports_match_id
         ) g ON true
         WHERE ep.player_id = $1
         ORDER BY e.starts_at DESC, m.round_number DESC, m.table_number DESC NULLS LAST`,
        [playerId],
      ),
      Query<ByeRow>(
        `SELECT
           'bye-' || e.id || '-' || stage_idx || '-' || section_idx || '-' || round_idx AS match_id,
           e.id AS event_id, e.name AS event_name, e.starts_at,
           (round.value->>'roundNumber')::int AS round_number
         FROM rb_event_participants ep
         JOIN rb_events e ON e.id = ep.event_id
         CROSS JOIN LATERAL jsonb_array_elements(e.raw->'stages')
           WITH ORDINALITY AS stage(value, stage_idx)
         CROSS JOIN LATERAL jsonb_array_elements(stage.value->'sections')
           WITH ORDINALITY AS section(value, section_idx)
         CROSS JOIN LATERAL jsonb_array_elements(section.value->'rounds')
           WITH ORDINALITY AS round(value, round_idx)
         CROSS JOIN LATERAL jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(round.value->'byeTeamIds') = 'array'
                THEN round.value->'byeTeamIds' ELSE '[]'::jsonb END
         ) AS bye(team_id)
         WHERE ep.player_id = $1
           AND bye.team_id = ep.esports_team_id
           AND round.value->>'status' = 'FINALIZED'
         ORDER BY e.starts_at DESC, round_number DESC`,
        [playerId],
      ),
      Query<EloHistoryRow>(
        `SELECT match_date, elo_after, elo_change, opponent_name, result
         FROM elo_history
         WHERE player_id = (
           SELECT max(eloshowdown_player_id)
           FROM rb_event_participants
           WHERE player_id = $1
         )
         ORDER BY match_date ASC, match_id ASC`,
        [playerId],
      ),
      Query<PlayerSummaryRow>(
        `SELECT p.player_id, p.current_elo, COALESCE(p.is_squad, false) AS is_squad
         FROM eloshowdown_players p
         WHERE p.player_id = (
           SELECT max(eloshowdown_player_id)
           FROM rb_event_participants
           WHERE player_id = $1
         )`,
        [playerId],
      ),
    ]);

  if (
    eventsResult.isErr() ||
    matchesResult.isErr() ||
    byesResult.isErr() ||
    eloResult.isErr() ||
    summaryResult.isErr()
  ) {
    console.error(
      '[riftbound player] DB error:',
      eventsResult.isErr()
        ? eventsResult.error
        : matchesResult.isErr()
          ? matchesResult.error
          : byesResult.isErr()
            ? byesResult.error
            : eloResult.isErr()
              ? eloResult.error
              : summaryResult.isErr()
                ? summaryResult.error
                : null,
    );
    return res.status(500).json({ error: 'Database error' });
  }

  const eventRows = eventsResult.value.rows;
  if (eventRows.length === 0) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const events: PlayerEventRow[] = eventRows.map((row) => ({
    eventId: row.event_id,
    eventName: row.event_name,
    startsAt: row.starts_at.toISOString(),
    status: row.status,
    isLocal: row.is_local,
    tournamentType: row.tournament_type,
    storeName: row.store_name,
    finalRank: row.final_rank,
    record: row.record,
    points: row.points,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    eloBefore: row.elo_before,
    eloAfter: row.elo_after,
    eloChange: row.elo_change,
    eloshowdownPlayerId: row.eloshowdown_player_id,
  }));

  const matches: PlayerMatchRow[] = matchesResult.value.rows.map((row) => ({
    matchId: row.match_id,
    eventId: row.event_id,
    eventName: row.event_name,
    startsAt: row.starts_at.toISOString(),
    roundNumber: row.round_number,
    tableNumber: row.table_number,
    opponentPlayerId: row.opponent_player_id,
    opponentName: row.opponent_name,
    outcome: row.outcome,
    gamesWon: row.games_won,
    gamesLost: row.games_lost,
    ties: row.ties,
    games: row.games,
  }));

  matches.push(
    ...byesResult.value.rows.map((row) => ({
      matchId: row.match_id,
      eventId: row.event_id,
      eventName: row.event_name,
      startsAt: row.starts_at.toISOString(),
      roundNumber: row.round_number,
      tableNumber: null,
      opponentPlayerId: null,
      opponentName: 'Bye',
      outcome: 'WIN',
      gamesWon: 0,
      gamesLost: 0,
      ties: 0,
      games: 0,
      isBye: true,
    })),
  );
  matches.sort(
    (a, b) =>
      b.startsAt.localeCompare(a.startsAt) ||
      b.roundNumber - a.roundNumber ||
      (b.tableNumber ?? 0) - (a.tableNumber ?? 0),
  );

  const eloHistory: EloHistoryPoint[] = eloResult.value.rows.map((row) => ({
    date: row.match_date.toISOString(),
    eloAfter: row.elo_after,
    eloChange: row.elo_change,
    opponentName: row.opponent_name,
    result: row.result,
  }));

  const wins = matches.filter((m) => normalizeOutcome(m.outcome) === 'WIN').length;
  const losses = matches.filter(
    (m) => normalizeOutcome(m.outcome) === 'LOSS',
  ).length;
  const draws = matches.filter(
    (m) => normalizeOutcome(m.outcome) === 'DRAW',
  ).length;
  const decided = wins + losses + draws;

  const matchupMap = new Map<string, PlayerMatchup>();
  for (const match of matches) {
    if (match.isBye) continue;
    const key = match.opponentPlayerId ?? `name:${match.opponentName ?? 'Unknown'}`;
    const entry = matchupMap.get(key) ?? {
      opponentPlayerId: match.opponentPlayerId,
      opponentName: match.opponentName ?? 'Unknown',
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      lastPlayedAt: match.startsAt,
    };
    entry.matches++;
    const outcome = normalizeOutcome(match.outcome);
    if (outcome === 'WIN') entry.wins++;
    else if (outcome === 'LOSS') entry.losses++;
    else if (outcome === 'DRAW') entry.draws++;
    if (new Date(match.startsAt) > new Date(entry.lastPlayedAt)) {
      entry.lastPlayedAt = match.startsAt;
    }
    matchupMap.set(key, entry);
  }
  const matchups = [...matchupMap.values()].sort(
    (a, b) =>
      b.matches - a.matches ||
      b.wins - a.wins ||
      a.opponentName.localeCompare(b.opponentName),
  );

  const summary = summaryResult.value.rows[0];
  const latest = eventRows[0];
  const mappedCompleted = eventRows.filter(
    (row) =>
      row.eloshowdown_player_id != null &&
      row.is_local &&
      row.status === 'COMPLETED' &&
      row.final_rank != null,
  );
  const latestMapped = mappedCompleted.reduce<number>(
    (max, row) => Math.max(max, new Date(row.starts_at).getTime()),
    0,
  );
  const communityEligible =
    (summary?.is_squad ?? false) ||
    (mappedCompleted.length >= 3 &&
      latestMapped >= Date.now() - 30 * 24 * 60 * 60 * 1000);

  const bestFinish = eventRows.reduce<number | null>((best, row) => {
    if (row.status !== 'COMPLETED' || row.final_rank == null) return best;
    return best == null ? row.final_rank : Math.min(best, row.final_rank);
  }, null);

  const peakElo =
    eloHistory.length > 0
      ? Math.max(...eloHistory.map((point) => point.eloAfter))
      : null;

  const response: PlayerProfileResponse = {
    player: {
      playerId,
      displayName: latest.display_name,
      tagLine: latest.tag_line,
      eloshowdownPlayerId:
        summary?.player_id ?? latest.eloshowdown_player_id ?? null,
      currentElo: summary?.current_elo ?? null,
      isSquad: summary?.is_squad ?? false,
      communityEligible,
      eventsPlayed: eventRows.length,
      matchesPlayed: matches.length,
      wins,
      losses,
      draws,
      winRate: decided > 0 ? wins / decided : null,
      bestFinish,
      lastEventAt: latest.starts_at.toISOString(),
      peakElo,
    },
    events,
    matches,
    matchups,
    eloHistory,
  };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=3600',
  );
  return res.status(200).json(response);
}
