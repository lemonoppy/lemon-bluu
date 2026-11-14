import { ResultAsync } from 'neverthrow';
import { PoolClient } from 'pg';

import { Config } from 'src/lib/config/config';
import Query, { withTransaction } from 'src/lib/db';
import { DatabaseError } from 'src/lib/errors';
import { logger } from 'src/lib/logger';

import {
  ParsedEventPage,
  RiftboundEventSummary,
  RiftboundRound,
  RiftboundStanding,
  RiftboundTournament,
  TournamentUnavailableError,
  fetchEventSummariesSince,
  fetchParsedEvent,
} from './client';

const LOCK_MINUTES = 60;
const MAX_FETCH_ATTEMPTS = 10;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const EARTH_RADIUS_M = 6_371_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const errorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

const unwrap = async <T>(result: ResultAsync<T, DatabaseError>): Promise<T> => {
  const resolved = await result;
  if (resolved.isErr()) throw resolved.error;
  return resolved.value;
};

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

export interface SyncedEvent {
  id: string;
  name: string;
  starts_at: Date;
  ends_at: Date | null;
}

export interface SyncResult {
  discovered: number;
  fetched: number;
  failed: number;
  locked: boolean;
}

interface ParticipantRow {
  eventId: string;
  teamId: string;
  playerId: string;
  displayName: string;
  tagLine: string | null;
  status: string | null;
  finalRank: number | null;
  record: string | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  matchesPlayed: number | null;
}

interface RoundRow {
  eventId: string;
  roundNumber: number;
  stageId: string | null;
  sectionType: string;
  status: string;
  startedAt: string | null;
  durationMin: number | null;
  byeTeamIds: string[];
}

interface MatchRow {
  matchId: string;
  eventId: string;
  roundNumber: number;
  tableNumber: number | null;
  status: string;
  strategy: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Outcome: string | null;
  team2Outcome: string | null;
}

interface GameRow {
  gameId: string;
  matchId: string;
  number: number | null;
  team1Outcome: string | null;
  team2Outcome: string | null;
}

interface StandingRow {
  eventId: string;
  roundNumber: number;
  teamId: string;
  rank: number;
  matchPoints: number;
  omw: number;
  gw: number;
  ogw: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface MappedEvent {
  store: { id: string; name: string; address: unknown } | null;
  event: {
    id: string;
    name: string;
    startsAt: string;
    endsAt: string | null;
    status: string;
    tournamentType: string | null;
    structure: string | null;
    roundCount: number | null;
    topCut: number | null;
    location: unknown;
    platformUpdatedAt: string | null;
    raw: RiftboundTournament;
    isLocal: boolean;
  };
  participants: ParticipantRow[];
  rounds: RoundRow[];
  matches: MatchRow[];
  games: GameRow[];
  standings: StandingRow[];
}

const outcomeFor = (
  outcomes: { esportsTeamId: string; outcome: string }[] | null,
  teamId: string | null,
): string | null =>
  teamId
    ? (outcomes?.find((outcome) => outcome.esportsTeamId === teamId)?.outcome ??
      null)
    : null;

const flattenRounds = (tournament: RiftboundTournament): RiftboundRound[] =>
  tournament.stages.flatMap((stage) =>
    stage.sections.flatMap((section) => section.rounds),
  );

export const mapTournamentToRows = ({
  tournament,
  organizer,
}: ParsedEventPage): MappedEvent => {
  const location =
    tournament.tournamentLocation ?? organizer?.physicalAddress ?? null;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const isLocal =
    latitude != null && longitude != null
      ? haversineMeters(
          Config.ottawaCoords.latitude,
          Config.ottawaCoords.longitude,
          latitude,
          longitude,
        ) <= Config.ottawaSearchRadiusMeters
      : true;

  // A team's final result is its latest standings entry across all rounds.
  const latestStandings = new Map<string, RiftboundStanding>();
  for (const round of flattenRounds(tournament)) {
    for (const standing of round.endOfRoundStandings ?? []) {
      latestStandings.set(standing.esportsTeamId, standing);
    }
  }

  const participants: ParticipantRow[] = tournament.tournamentParticipants.map(
    (participant) => {
      const final = latestStandings.get(participant.esportsTeamId) ?? null;
      return {
        eventId: tournament.id,
        teamId: participant.esportsTeamId,
        playerId: participant.player.id,
        displayName: participant.player.displayName,
        tagLine: participant.player.tagLine ?? null,
        status: participant.status ?? null,
        finalRank: final?.rank ?? null,
        record: final
          ? `${final.matchWins}-${final.matchLosses}-${final.matchDraws}`
          : null,
        points: final?.matchPoints ?? null,
        wins: final?.matchWins ?? null,
        losses: final?.matchLosses ?? null,
        draws: final?.matchDraws ?? null,
        matchesPlayed: final
          ? final.matchWins + final.matchLosses + final.matchDraws
          : null,
      };
    },
  );

  const rounds: RoundRow[] = [];
  const matches: MatchRow[] = [];
  const games: GameRow[] = [];
  const standings: StandingRow[] = [];
  let roundNumber = 0;

  for (const stage of tournament.stages) {
    for (const section of stage.sections) {
      for (const round of section.rounds) {
        roundNumber++;
        rounds.push({
          eventId: tournament.id,
          roundNumber,
          stageId: stage.esportsStageId ?? null,
          sectionType: section.type,
          status: round.status,
          startedAt: round.startedAt ?? null,
          durationMin: round.roundDuration ?? null,
          byeTeamIds: round.byeTeamIds ?? [],
        });

        for (const match of round.matches ?? []) {
          const team1Id = match.teams?.[0]?.esportsTeamId ?? null;
          const team2Id = match.teams?.[1]?.esportsTeamId ?? null;
          // Byes are synthetic matches (id "bye-...", one real team) reused
          // across events, so they aren't part of match history.
          if (
            !match.esportsMatchId ||
            match.esportsMatchId.startsWith('bye-') ||
            !team1Id ||
            !team2Id
          ) {
            continue;
          }

          matches.push({
            matchId: match.esportsMatchId,
            eventId: tournament.id,
            roundNumber,
            tableNumber: match.tableNumber ?? null,
            status: match.status,
            strategy: match.strategy,
            team1Id,
            team2Id,
            team1Outcome: outcomeFor(match.teamOutcomes, team1Id),
            team2Outcome: outcomeFor(match.teamOutcomes, team2Id),
          });

          for (const game of match.games ?? []) {
            games.push({
              gameId: game.esportsGameId,
              matchId: match.esportsMatchId,
              number: game.number ?? null,
              team1Outcome: outcomeFor(game.teamOutcomes, team1Id),
              team2Outcome: outcomeFor(game.teamOutcomes, team2Id),
            });
          }
        }

        for (const standing of round.endOfRoundStandings ?? []) {
          standings.push({
            eventId: tournament.id,
            roundNumber,
            teamId: standing.esportsTeamId,
            rank: standing.rank,
            matchPoints: standing.matchPoints,
            omw: Number(standing.opponentMatchWinPercentage),
            gw: Number(standing.gameWinPercentage),
            ogw: Number(standing.opponentGameWinPercentage),
            wins: standing.matchWins,
            losses: standing.matchLosses,
            draws: standing.matchDraws,
          });
        }
      }
    }
  }

  return {
    store: organizer
      ? {
          id: organizer.id,
          name: organizer.name,
          address: organizer.physicalAddress ?? null,
        }
      : null,
    event: {
      id: tournament.id,
      name: tournament.name,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      status: tournament.status,
      tournamentType: tournament.config?.tournamentType ?? null,
      structure: tournament.config?.structure ?? null,
      roundCount: tournament.config?.roundCount ?? null,
      topCut: tournament.config?.finalBracketStage?.participantCount ?? null,
      location,
      platformUpdatedAt: tournament.updatedAt ?? null,
      raw: tournament,
      isLocal,
    },
    participants,
    rounds,
    matches,
    games,
    standings,
  };
};

const upsertStore = async (
  client: PoolClient,
  store: MappedEvent['store'],
): Promise<void> => {
  if (!store) return;
  await client.query(
    `INSERT INTO rb_stores (id, name, address)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       address = COALESCE(EXCLUDED.address, rb_stores.address),
       updated_at = now()`,
    [
      store.id,
      store.name,
      store.address ? JSON.stringify(store.address) : null,
    ],
  );
};

const upsertEvent = async (
  client: PoolClient,
  mapped: MappedEvent,
): Promise<SyncedEvent> => {
  const { event, rounds } = mapped;
  const current = await client.query<{
    fetch_attempts: number;
    completed_fetches: number;
  }>(
    'SELECT fetch_attempts, completed_fetches FROM rb_events WHERE id = $1 FOR UPDATE',
    [event.id],
  );
  const existing = current.rows[0];
  const completed =
    event.status === 'COMPLETED' &&
    rounds.every((round) => round.status === 'FINALIZED');
  const now = Date.now();
  const endMs = event.endsAt ? new Date(event.endsAt).getTime() : null;
  const pastRecheckCutoff = endMs != null && now > endMs + 24 * HOUR_MS;

  let recheckAfter: string | null = null;
  if (!completed) {
    if (!pastRecheckCutoff) {
      recheckAfter = new Date(
        now + Config.riftboundSyncRecheckMinutes * MINUTE_MS,
      ).toISOString();
    }
  } else if ((existing?.completed_fetches ?? 0) === 0) {
    recheckAfter = new Date(
      now + Config.riftboundCompletedRecheckHours * HOUR_MS,
    ).toISOString();
  }

  const result = await client.query<SyncedEvent>(
    `INSERT INTO rb_events (
       id, name, store_id, starts_at, ends_at, status, tournament_type,
       structure, round_count, top_cut, is_local, location,
       platform_updated_at, raw, fetch_count, fetch_attempts,
       completed_fetches, first_fetched_at, last_fetched_at, recheck_after,
       elo_complete, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12::jsonb,
       $13, $14::jsonb, 1, 0,
       $15, now(), now(), $16,
       false, now()
     )
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       store_id = COALESCE(EXCLUDED.store_id, rb_events.store_id),
       starts_at = EXCLUDED.starts_at,
       ends_at = EXCLUDED.ends_at,
       status = EXCLUDED.status,
       tournament_type = COALESCE(EXCLUDED.tournament_type, rb_events.tournament_type),
       structure = EXCLUDED.structure,
       round_count = EXCLUDED.round_count,
       top_cut = EXCLUDED.top_cut,
       is_local = EXCLUDED.is_local,
       location = COALESCE(EXCLUDED.location, rb_events.location),
       platform_updated_at = COALESCE(EXCLUDED.platform_updated_at, rb_events.platform_updated_at),
       raw = EXCLUDED.raw,
       fetch_count = rb_events.fetch_count + 1,
       fetch_attempts = 0,
       completed_fetches = rb_events.completed_fetches + EXCLUDED.completed_fetches,
       first_fetched_at = COALESCE(rb_events.first_fetched_at, now()),
       last_fetched_at = now(),
       recheck_after = EXCLUDED.recheck_after,
       elo_complete = CASE
         WHEN rb_events.raw IS DISTINCT FROM EXCLUDED.raw
              AND rb_events.status = 'COMPLETED' THEN false
         ELSE rb_events.elo_complete
       END,
       updated_at = now()
     RETURNING id, name, starts_at, ends_at`,
    [
      event.id,
      event.name,
      mapped.store?.id ?? null,
      event.startsAt,
      event.endsAt,
      event.status,
      event.tournamentType,
      event.structure,
      event.roundCount,
      event.topCut,
      event.isLocal,
      event.location ? JSON.stringify(event.location) : null,
      event.platformUpdatedAt,
      JSON.stringify(event.raw),
      completed ? 1 : 0,
      recheckAfter,
    ],
  );
  return result.rows[0];
};

const upsertParticipants = async (
  client: PoolClient,
  rows: ParticipantRow[],
): Promise<void> => {
  if (rows.length === 0) return;
  await client.query(
    `INSERT INTO rb_event_participants (
       event_id, esports_team_id, player_id, display_name, tag_line, status,
       final_rank, record, points, wins, losses, draws, matches_played
     )
     SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::text[]),
            unnest($4::text[]), unnest($5::text[]), unnest($6::text[]),
            unnest($7::int[]), unnest($8::text[]), unnest($9::int[]),
            unnest($10::int[]), unnest($11::int[]), unnest($12::int[]),
            unnest($13::int[])
     ON CONFLICT (event_id, esports_team_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       tag_line = EXCLUDED.tag_line,
       status = EXCLUDED.status,
       final_rank = EXCLUDED.final_rank,
       record = EXCLUDED.record,
       points = EXCLUDED.points,
       wins = EXCLUDED.wins,
       losses = EXCLUDED.losses,
       draws = EXCLUDED.draws,
       matches_played = EXCLUDED.matches_played`,
    [
      rows.map((row) => row.eventId),
      rows.map((row) => row.teamId),
      rows.map((row) => row.playerId),
      rows.map((row) => row.displayName),
      rows.map((row) => row.tagLine),
      rows.map((row) => row.status),
      rows.map((row) => row.finalRank),
      rows.map((row) => row.record),
      rows.map((row) => row.points),
      rows.map((row) => row.wins),
      rows.map((row) => row.losses),
      rows.map((row) => row.draws),
      rows.map((row) => row.matchesPlayed),
    ],
  );
};

const replaceRounds = async (
  client: PoolClient,
  mapped: MappedEvent,
): Promise<void> => {
  await client.query('DELETE FROM rb_matches WHERE event_id = $1', [
    mapped.event.id,
  ]);
  await client.query('DELETE FROM rb_standings WHERE event_id = $1', [
    mapped.event.id,
  ]);
  await client.query('DELETE FROM rb_rounds WHERE event_id = $1', [
    mapped.event.id,
  ]);

  for (const round of mapped.rounds) {
    await client.query(
      `INSERT INTO rb_rounds (
         event_id, round_number, stage_id, section_type, status, started_at,
         duration_min, bye_team_ids
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        round.eventId,
        round.roundNumber,
        round.stageId,
        round.sectionType,
        round.status,
        round.startedAt,
        round.durationMin,
        round.byeTeamIds,
      ],
    );
  }

  if (mapped.matches.length > 0) {
    await client.query(
      `INSERT INTO rb_matches (
         esports_match_id, event_id, round_number, table_number, status,
         strategy, team1_id, team2_id, team1_outcome, team2_outcome
       )
       SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::int[]),
              unnest($4::int[]), unnest($5::text[]), unnest($6::text[]),
              unnest($7::text[]), unnest($8::text[]), unnest($9::text[]),
              unnest($10::text[])`,
      [
        mapped.matches.map((row) => row.matchId),
        mapped.matches.map((row) => row.eventId),
        mapped.matches.map((row) => row.roundNumber),
        mapped.matches.map((row) => row.tableNumber),
        mapped.matches.map((row) => row.status),
        mapped.matches.map((row) => row.strategy),
        mapped.matches.map((row) => row.team1Id),
        mapped.matches.map((row) => row.team2Id),
        mapped.matches.map((row) => row.team1Outcome),
        mapped.matches.map((row) => row.team2Outcome),
      ],
    );
  }

  if (mapped.games.length > 0) {
    await client.query(
      `INSERT INTO rb_games (
         esports_game_id, esports_match_id, game_number, team1_outcome,
         team2_outcome
       )
       SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::int[]),
              unnest($4::text[]), unnest($5::text[])`,
      [
        mapped.games.map((row) => row.gameId),
        mapped.games.map((row) => row.matchId),
        mapped.games.map((row) => row.number),
        mapped.games.map((row) => row.team1Outcome),
        mapped.games.map((row) => row.team2Outcome),
      ],
    );
  }

  if (mapped.standings.length > 0) {
    await client.query(
      `INSERT INTO rb_standings (
         event_id, round_number, esports_team_id, rank, match_points, omw, gw,
         ogw, wins, losses, draws
       )
       SELECT unnest($1::text[]), unnest($2::int[]), unnest($3::text[]),
              unnest($4::int[]), unnest($5::int[]), unnest($6::numeric[]),
              unnest($7::numeric[]), unnest($8::numeric[]), unnest($9::int[]),
              unnest($10::int[]), unnest($11::int[])`,
      [
        mapped.standings.map((row) => row.eventId),
        mapped.standings.map((row) => row.roundNumber),
        mapped.standings.map((row) => row.teamId),
        mapped.standings.map((row) => row.rank),
        mapped.standings.map((row) => row.matchPoints),
        mapped.standings.map((row) => row.omw),
        mapped.standings.map((row) => row.gw),
        mapped.standings.map((row) => row.ogw),
        mapped.standings.map((row) => row.wins),
        mapped.standings.map((row) => row.losses),
        mapped.standings.map((row) => row.draws),
      ],
    );
  }
};

const writeEvent = async (mapped: MappedEvent): Promise<SyncedEvent> => {
  return unwrap(
    withTransaction(async (client) => {
      await upsertStore(client, mapped.store);
      const event = await upsertEvent(client, mapped);
      await upsertParticipants(client, mapped.participants);
      await replaceRounds(client, mapped);
      return event;
    }),
  );
};

// Live ingest used by /track; bypasses the discovery/recheck schedule.
export async function ingestEventById(eventId: string): Promise<SyncedEvent> {
  return writeEvent(mapTournamentToRows(await fetchParsedEvent(eventId)));
}

const upsertDiscovery = async (
  summaries: RiftboundEventSummary[],
): Promise<void> => {
  const stores = new Map<string, { id: string; name: string }>();
  for (const summary of summaries) {
    if (summary.organizerId) {
      stores.set(summary.organizerId, {
        id: summary.organizerId,
        name: summary.organizerName ?? summary.organizerId,
      });
    }
  }

  if (stores.size > 0) {
    const list = [...stores.values()];
    await unwrap(
      Query(
        `INSERT INTO rb_stores (id, name)
         SELECT unnest($1::text[]), unnest($2::text[])
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           updated_at = now()`,
        [list.map((store) => store.id), list.map((store) => store.name)],
      ),
    );
  }

  if (summaries.length === 0) return;
  await unwrap(
    Query(
      `INSERT INTO rb_events (
         id, name, store_id, starts_at, tournament_type, location, is_local
       )
       SELECT unnest($1::text[]), unnest($2::text[]), unnest($3::text[]),
              unnest($4::timestamptz[]), unnest($5::text[]),
              NULLIF(unnest($6::text[]), '')::jsonb, true
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         store_id = COALESCE(EXCLUDED.store_id, rb_events.store_id),
         starts_at = EXCLUDED.starts_at,
         tournament_type = COALESCE(EXCLUDED.tournament_type, rb_events.tournament_type),
         location = COALESCE(EXCLUDED.location, rb_events.location),
         updated_at = now()`,
      [
        summaries.map((summary) => summary.id),
        summaries.map((summary) => summary.name),
        summaries.map((summary) => summary.organizerId),
        summaries.map((summary) => summary.startsAt),
        summaries.map((summary) => summary.tournamentType),
        summaries.map((summary) =>
          summary.location ? JSON.stringify(summary.location) : '',
        ),
      ],
    ),
  );
};

const acquireLock = async (): Promise<boolean> => {
  const result = await unwrap(
    Query<{ id: number }>(
      `INSERT INTO rb_sync_state (id, running_until, last_started_at)
       VALUES (1, now() + ($1::int * interval '1 minute'), now())
       ON CONFLICT (id) DO UPDATE SET
         running_until = EXCLUDED.running_until,
         last_started_at = now()
       WHERE rb_sync_state.running_until IS NULL
          OR rb_sync_state.running_until < now()
       RETURNING id`,
      [LOCK_MINUTES],
    ),
  );
  return result.rowCount === 1;
};

const releaseLock = async (error?: unknown): Promise<void> => {
  await Query(
    `UPDATE rb_sync_state
     SET running_until = NULL, last_finished_at = now(), last_error = $1
     WHERE id = 1`,
    [error ? (error instanceof Error ? error.message : String(error)) : null],
  );
};

const markFetchFailure = async (
  eventId: string,
  terminal = false,
): Promise<void> => {
  await Query(
    `UPDATE rb_events
     SET fetch_attempts = CASE WHEN $4 THEN $2 ELSE fetch_attempts + 1 END,
         status = CASE WHEN $4 THEN 'UNAVAILABLE' ELSE status END,
         recheck_after = CASE
           WHEN $4 THEN NULL
           WHEN fetch_attempts + 1 >= $2 THEN NULL
           ELSE now() + ($3::int * interval '1 minute')
         END,
         updated_at = now()
     WHERE id = $1`,
    [eventId, MAX_FETCH_ATTEMPTS, Config.riftboundSyncRecheckMinutes, terminal],
  );
};

export async function syncRiftboundEvents(
  maxEvents: number = Config.riftboundSyncMaxEventsPerRun,
): Promise<SyncResult> {
  if (!(await acquireLock())) {
    logger.info('Riftbound sync already running; skipping this run');
    return { discovered: 0, fetched: 0, failed: 0, locked: true };
  }

  let discovered = 0;
  let fetched = 0;
  let failed = 0;
  let syncError: unknown;
  try {
    const summaries = await fetchEventSummariesSince(
      Config.riftboundHistoryStartDate,
    );
    discovered = summaries.length;
    await upsertDiscovery(summaries);

    const candidates = await unwrap(
      Query<{ id: string }>(
        `SELECT id FROM rb_events
         WHERE starts_at <= now()
           AND fetch_attempts < $2
           AND (last_fetched_at IS NULL OR recheck_after <= now())
         ORDER BY (tournament_type IN ('NEXUS_NIGHT', 'PRE_RIFT')) ASC,
                  starts_at ASC
         LIMIT $1`,
        [maxEvents, MAX_FETCH_ATTEMPTS],
      ),
    );

    for (const candidate of candidates.rows) {
      try {
        await writeEvent(
          mapTournamentToRows(await fetchParsedEvent(candidate.id)),
        );
        fetched++;
      } catch (error) {
        failed++;
        logger.warn(
          { error: errorMessage(error), eventId: candidate.id },
          'Riftbound event fetch failed',
        );
        await markFetchFailure(
          candidate.id,
          error instanceof TournamentUnavailableError,
        );
      }
      await sleep(Config.riftboundSyncDelayMs);
    }

    await Query(
      `UPDATE rb_sync_state
       SET last_discovered = $1, last_fetched = $2, last_failed = $3
       WHERE id = 1`,
      [discovered, fetched, failed],
    );

    logger.info(
      { discovered, fetched, failed },
      'Riftbound event sync complete',
    );
    return { discovered, fetched, failed, locked: false };
  } catch (error) {
    syncError = error;
    logger.error({ error }, 'Riftbound event sync failed');
    throw error;
  } finally {
    await releaseLock(syncError);
  }
}
