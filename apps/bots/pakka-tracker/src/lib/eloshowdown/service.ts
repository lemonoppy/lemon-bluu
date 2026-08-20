import { Config } from 'src/lib/config/config';
import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';
import { UVSEventSummary, fetchEventsByStore } from 'src/lib/uvs/client';
import { EventParticipant, fetchEventParticipants } from 'src/lib/uvs/scraper';
import { squadMemberByPlayerId, squadMembers } from 'src/lib/uvs/squad';

import {
  BudgetExceededError,
  EloShowdownApiError,
  fetchEloHistory,
  fetchPlayer,
  getRequestCount,
  lookupPlayer,
  resetRequestCount,
} from './client';
import { EventElo, computeEventElo, parseRecord } from './elo';
import { EloHistoryPoint } from './types';

export interface ProcessOttawaEventsOptions {
  maxEvents?: number;
}

export interface ProcessResult {
  eventsProcessed: number;
  eventsRemaining: number;
  playersMapped: number;
  eloHistoriesFetched: number;
  requestsUsed: number;
  stoppedEarly: boolean;
}

interface PlayerMapping {
  playerId: number;
}

const eloHistoryCache = new Map<number, EloHistoryPoint[]>();
const counters = { playersMapped: 0, eloHistoriesFetched: 0 };

const getFinishedUnprocessedEvents = async (): Promise<UVSEventSummary[]> => {
  const events = await fetchEventsByStore(Config.ottawaStoreIds);

  const processedResult = await Query<{ uvs_event_id: number }>(
    'SELECT uvs_event_id FROM ottawa_events',
  );
  if (processedResult.isErr()) throw processedResult.error;
  const processed = new Set(
    processedResult.value.rows.map((row) => row.uvs_event_id),
  );

  const now = new Date();
  return events
    .filter((event) => {
      const finish = event.end_datetime ?? event.heuristic_end_datetime;
      return finish != null && new Date(finish) < now && !processed.has(event.id);
    })
    .sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );
};

const ensurePlayer = async (
  riftboundId: number,
): Promise<PlayerMapping | null> => {
  const existing = await Query<{ player_id: number }>(
    'SELECT player_id FROM eloshowdown_players WHERE riftbound_id = $1',
    [String(riftboundId)],
  );
  if (existing.isErr()) throw existing.error;
  if (existing.value.rowCount && existing.value.rows.length > 0) {
    return { playerId: existing.value.rows[0].player_id };
  }

  try {
    const player = await lookupPlayer(riftboundId);
    const isSquad = squadMemberByPlayerId.has(player.id);
    const insert = await Query(
      `INSERT INTO eloshowdown_players
         (player_id, riftbound_id, display_name, community_tag, country, is_squad)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (riftbound_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         community_tag = EXCLUDED.community_tag,
         country = EXCLUDED.country,
         is_squad = eloshowdown_players.is_squad OR EXCLUDED.is_squad,
         last_seen_at = now()`,
      [
        player.id,
        player.riftbound_id,
        player.display_name,
        player.primary_community,
        player.country,
        isSquad,
      ],
    );
    if (insert.isErr()) throw insert.error;

    counters.playersMapped++;
    return { playerId: player.id };
  } catch (error) {
    if (error instanceof EloShowdownApiError && error.status === 429) {
      throw error;
    }
    if (error instanceof BudgetExceededError) {
      throw error;
    }
    logger.warn(
      { error, riftboundId },
      `Failed to map riftbound id to an EloShowdown player`,
    );
    return null;
  }
};

const ensureEloHistory = async (
  playerId: number,
  minDate?: Date,
): Promise<EloHistoryPoint[]> => {
  const cached = eloHistoryCache.get(playerId);
  if (cached) return cached;

  // Reuse stored history when it already reaches the requested date.
  if (minDate) {
    const latestResult = await Query<{ latest: Date | null }>(
      'SELECT MAX(match_date) AS latest FROM elo_history WHERE player_id = $1',
      [playerId],
    );
    if (latestResult.isErr()) throw latestResult.error;
    const latest = latestResult.value.rows[0]?.latest;
    if (latest && new Date(latest) >= minDate) {
      const rows = await Query<{
        match_date: Date;
        elo_before: number;
        elo_after: number;
        elo_change: number;
        match_id: number;
        opponent_id: number | null;
        opponent_name: string | null;
        result: string | null;
      }>(
        `SELECT match_date, elo_before, elo_after, elo_change, match_id,
                opponent_id, opponent_name, result
         FROM elo_history WHERE player_id = $1`,
        [playerId],
      );
      if (rows.isErr()) throw rows.error;
      const points: EloHistoryPoint[] = rows.value.rows.map((row) => ({
        date: row.match_date.toISOString(),
        elo_before: row.elo_before,
        elo_after: row.elo_after,
        elo_change: row.elo_change,
        match_id: row.match_id,
        opponent_id: row.opponent_id ?? 0,
        opponent_name: row.opponent_name ?? '',
        result: row.result ?? '',
      }));
      eloHistoryCache.set(playerId, points);
      return points;
    }
  }

  const response = await fetchEloHistory(playerId);
  const points = (response.points ?? []).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  counters.eloHistoriesFetched++;

  if (points.length > 0) {
    const upsert = await Query(
      `INSERT INTO elo_history
         (player_id, match_id, match_date, elo_before, elo_after, elo_change, opponent_id, opponent_name, result)
       SELECT $1, unnest($2::bigint[]), unnest($3::timestamptz[]), unnest($4::int[]),
              unnest($5::int[]), unnest($6::int[]), unnest($7::int[]), unnest($8::text[]), unnest($9::text[])
       ON CONFLICT (player_id, match_id) DO UPDATE SET
         elo_before = EXCLUDED.elo_before,
         elo_after = EXCLUDED.elo_after,
         elo_change = EXCLUDED.elo_change`,
      [
        playerId,
        points.map((p) => p.match_id),
        points.map((p) => p.date),
        points.map((p) => p.elo_before),
        points.map((p) => p.elo_after),
        points.map((p) => p.elo_change),
        points.map((p) => p.opponent_id),
        points.map((p) => p.opponent_name),
        points.map((p) => p.result),
      ],
    );
    if (upsert.isErr()) throw upsert.error;

    const latest = points[points.length - 1];
    const eloUpdate = await Query(
      `UPDATE eloshowdown_players
       SET current_elo = $2, elo_updated_at = now(), last_seen_at = now()
       WHERE player_id = $1`,
      [playerId, latest.elo_after],
    );
    if (eloUpdate.isErr()) throw eloUpdate.error;
  }

  eloHistoryCache.set(playerId, points);
  return points;
};

const ensureSquadPlayers = async (): Promise<void> => {
  for (const member of squadMembers) {
    try {
      const player = await fetchPlayer(member.eloShowdownId);
      const upsert = await Query(
        `INSERT INTO eloshowdown_players
           (player_id, riftbound_id, display_name, community_tag, country, is_squad)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (player_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           community_tag = EXCLUDED.community_tag,
           country = EXCLUDED.country,
           is_squad = true`,
        [
          player.id,
          player.riftbound_id,
          player.display_name,
          player.primary_community,
          player.country,
        ],
      );
      if (upsert.isErr()) throw upsert.error;

      // Keep the squad's current elo fresh.
      await ensureEloHistory(player.id);
    } catch (error) {
      if (error instanceof BudgetExceededError) throw error;
      if (error instanceof EloShowdownApiError && error.status === 429) throw error;
      logger.warn(
        { error, playerId: member.eloShowdownId },
        `Failed to sync squad member`,
      );
    }
  }
};

const upsertEvent = async (event: UVSEventSummary): Promise<number> => {
  const result = await Query<{ id: number }>(
    `INSERT INTO ottawa_events (uvs_event_id, name, store_id, start_datetime, end_datetime)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (uvs_event_id) DO UPDATE SET
       name = EXCLUDED.name,
       end_datetime = EXCLUDED.end_datetime
     RETURNING id`,
    [
      event.id,
      event.name,
      event.store?.id ?? 0,
      event.start_datetime,
      event.end_datetime,
    ],
  );
  if (result.isErr()) throw result.error;
  return result.value.rows[0].id;
};

const upsertEventPlayer = async (
  eventId: number,
  participant: EventParticipant,
  playerId: number,
  elo: EventElo,
) => {
  const { wins, losses, draws } = parseRecord(participant.record);
  const eloChange =
    elo.eloBefore != null && elo.eloAfter != null
      ? elo.eloAfter - elo.eloBefore
      : null;

  const result = await Query(
    `INSERT INTO event_players
       (event_id, player_id, uvs_username, rank, record, points, matches_played,
        wins, losses, draws, elo_before, elo_after, elo_change)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (event_id, player_id) DO UPDATE SET
       rank = EXCLUDED.rank,
       record = EXCLUDED.record,
       points = EXCLUDED.points,
       matches_played = EXCLUDED.matches_played,
       wins = EXCLUDED.wins,
       losses = EXCLUDED.losses,
       draws = EXCLUDED.draws,
       elo_before = EXCLUDED.elo_before,
       elo_after = EXCLUDED.elo_after,
       elo_change = EXCLUDED.elo_change`,
    [
      eventId,
      playerId,
      participant.username,
      participant.rank,
      participant.record,
      participant.points,
      elo.matches,
      wins,
      losses,
      draws,
      elo.eloBefore,
      elo.eloAfter,
      eloChange,
    ],
  );
  if (result.isErr()) throw result.error;
};

/**
 * Processes a single event. Returns false if the run's EloShowdown request
 * budget was hit mid-event, in which case nothing is recorded so the event is
 * retried on the next run.
 */
const processEvent = async (
  event: UVSEventSummary,
): Promise<boolean> => {
  const { event: eventData, participants } = await fetchEventParticipants(event.id);

  if (participants.length === 0) {
    await upsertEvent(event);
    logger.warn(`Event ${event.id} (${event.name}) has no standings; recorded`);
    return true;
  }

  const start = new Date(eventData.start_datetime);
  const end = new Date(
    eventData.end_datetime ?? event.heuristic_end_datetime ?? eventData.start_datetime,
  );

  const processed: { participant: EventParticipant; playerId: number; elo: EventElo }[] = [];
  for (const participant of participants) {
    if (participant.userId === 0) continue;

    const mapping = await ensurePlayer(participant.userId);
    if (!mapping) continue;

    const history = await ensureEloHistory(mapping.playerId, end);
    processed.push({
      participant,
      playerId: mapping.playerId,
      elo: computeEventElo(history, start, end),
    });
  }

  const eventId = await upsertEvent(event);
  for (const row of processed) {
    await upsertEventPlayer(eventId, row.participant, row.playerId, row.elo);
  }

  logger.info(
    `Processed event ${event.id} (${event.name}) with ${processed.length}/${participants.length} participants`,
  );
  return true;
};

export async function processOttawaEvents(
  options: ProcessOttawaEventsOptions = {},
): Promise<ProcessResult> {
  const maxEvents = options.maxEvents ?? Config.ottawaMaxEventsPerRun;
  eloHistoryCache.clear();
  resetRequestCount();
  counters.playersMapped = 0;
  counters.eloHistoriesFetched = 0;

  let eventsProcessed = 0;
  let eventsRemaining = 0;
  let stoppedEarly = false;

  try {
    await ensureSquadPlayers();
  } catch (error) {
    if (
      error instanceof BudgetExceededError ||
      (error instanceof EloShowdownApiError && error.status === 429)
    ) {
      logger.warn('EloShowdown budget/rate limit hit during squad sync; stopping run');
      stoppedEarly = true;
    } else {
      throw error;
    }
  }

  if (!stoppedEarly) {
    const events = await getFinishedUnprocessedEvents();
    eventsRemaining = Math.max(0, events.length - maxEvents);

    for (const event of events.slice(0, maxEvents)) {
      try {
        const completed = await processEvent(event);
        if (!completed) {
          stoppedEarly = true;
          break;
        }
        eventsProcessed++;
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          logger.info('EloShowdown request budget exhausted; stopping run');
          stoppedEarly = true;
          break;
        }
        if (error instanceof EloShowdownApiError && error.status === 429) {
          logger.warn('EloShowdown rate limit hit; stopping run');
          stoppedEarly = true;
          break;
        }
        logger.error(
          { error, eventId: event.id },
          `Failed to process Ottawa event ${event.id}`,
        );
      }
    }
  }

  const result: ProcessResult = {
    eventsProcessed,
    eventsRemaining,
    playersMapped: counters.playersMapped,
    eloHistoriesFetched: counters.eloHistoriesFetched,
    requestsUsed: getRequestCount(),
    stoppedEarly,
  };

  logger.info(
    `Ottawa events job: ${result.eventsProcessed} processed, ${result.eventsRemaining} remaining, ` +
      `${result.requestsUsed} requests used${result.stoppedEarly ? ' (stopped early)' : ''}`,
  );
  return result;
}
