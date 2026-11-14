import { Config } from 'src/lib/config/config';
import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';
import { squadMemberByPlayerId, squadMembers } from 'src/lib/uvs/squad';
import { SyncedEvent, ingestEventById } from 'src/lib/uvs/sync';

import {
  BudgetExceededError,
  EloShowdownApiError,
  fetchEloHistory,
  fetchPlayer,
  getRequestCount,
  lookupPlayer,
  resetRequestCount,
} from './client';
import { EventElo, computeEventElo } from './elo';
import { EloHistoryPoint } from './types';

export interface ProcessOttawaEventsOptions {
  maxEvents?: number;
}

export interface ProcessResult {
  eventsProcessed: number;
  eventsRemaining: number;
  playersMapped: number;
  eloHistoriesFetched: number;
  staleElosRefreshed: number;
  requestsUsed: number;
  stoppedEarly: boolean;
}

export interface ProcessSingleEventResult {
  eventName: string;
  participants: number;
  processedPlayers: number;
  eloComplete: boolean;
  stoppedEarly: boolean;
  requestsUsed: number;
}

interface ProcessEventResult {
  completed: boolean;
  participants: number;
  processedPlayers: number;
  eloComplete: boolean;
}

interface PlayerMapping {
  playerId: number;
}

const eloHistoryCache = new Map<number, EloHistoryPoint[]>();
const counters = { playersMapped: 0, eloHistoriesFetched: 0 };

// Lowercase display name → EloShowdown player_id, used to link UVS standings
// participants to players without a per-player lookup. Only unambiguous names
// are included.
let nameIndex = new Map<string, number>();

const buildNameIndex = async (): Promise<void> => {
  const counts = new Map<string, { playerId: number; count: number }>();
  const addName = (name: string, playerId: number) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { playerId, count: 1 });
    }
  };

  const playersResult = await Query<{
    display_name: string;
    player_id: number;
  }>(
    'SELECT display_name, player_id FROM eloshowdown_players WHERE display_name IS NOT NULL',
  );
  if (playersResult.isErr()) throw playersResult.error;
  for (const row of playersResult.value.rows)
    addName(row.display_name, row.player_id);

  const opponentsResult = await Query<{
    opponent_id: number;
    opponent_name: string | null;
  }>(
    `SELECT DISTINCT opponent_id, opponent_name FROM elo_history
     WHERE opponent_name IS NOT NULL AND opponent_name != '' AND opponent_id IS NOT NULL`,
  );
  if (opponentsResult.isErr()) throw opponentsResult.error;
  for (const row of opponentsResult.value.rows) {
    if (row.opponent_name) addName(row.opponent_name, row.opponent_id);
  }

  nameIndex = new Map<string, number>();
  for (const [key, { playerId, count }] of counts) {
    if (count === 1) nameIndex.set(key, playerId);
  }
};

const seedPlayersByName = async (
  names: { playerId: number; displayName: string }[],
): Promise<void> => {
  const fresh = names.filter(
    (entry) =>
      entry.displayName &&
      !nameIndex.has(entry.displayName.trim().toLowerCase()),
  );
  if (fresh.length === 0) return;

  const result = await Query(
    `INSERT INTO eloshowdown_players (player_id, display_name)
     SELECT unnest($1::int[]), unnest($2::text[])
     ON CONFLICT (player_id) DO NOTHING`,
    [
      fresh.map((entry) => entry.playerId),
      fresh.map((entry) => entry.displayName),
    ],
  );
  if (result.isErr()) throw result.error;

  for (const entry of fresh) {
    nameIndex.set(entry.displayName.trim().toLowerCase(), entry.playerId);
  }
};

const seedOpponents = async (points: EloHistoryPoint[]): Promise<void> => {
  const opponents = new Map<number, string>();
  for (const point of points) {
    if (point.opponent_id > 0 && point.opponent_name) {
      opponents.set(point.opponent_id, point.opponent_name);
    }
  }
  await seedPlayersByName(
    Array.from(opponents.entries()).map(([playerId, displayName]) => ({
      playerId,
      displayName,
    })),
  );
};

const getEligibleEvents = async (): Promise<SyncedEvent[]> => {
  const result = await Query<SyncedEvent>(
    `SELECT e.id, e.name, e.starts_at, e.ends_at
     FROM rb_events e
     WHERE e.is_local
       AND e.status = 'COMPLETED'
       AND e.last_fetched_at IS NOT NULL
       AND e.starts_at < now() - ($1::int * interval '1 hour')
       AND EXISTS (
         SELECT 1 FROM rb_event_participants p
         WHERE p.event_id = e.id AND p.final_rank IS NOT NULL
       )
       AND e.elo_complete = false
       AND (
         e.elo_processed_at IS NULL
         OR (
           e.elo_processed_at < now() - ($2::int * interval '1 hour')
           AND COALESCE(e.ends_at, e.starts_at) >
               now() - ($3::int * interval '1 day')
         )
       )
     ORDER BY e.starts_at DESC`,
    [
      Config.eloshowdownGraceHours,
      Config.eloshowdownRecheckHours,
      Config.eloshowdownRecheckDays,
    ],
  );
  if (result.isErr()) throw result.error;
  return result.value.rows;
};

const ensurePlayer = async (
  riftboundId: string,
  username: string,
): Promise<PlayerMapping | null> => {
  const existing = await Query<{ player_id: number }>(
    'SELECT player_id FROM eloshowdown_players WHERE riftbound_id = $1',
    [String(riftboundId)],
  );
  if (existing.isErr()) throw existing.error;
  if (existing.value.rowCount && existing.value.rows.length > 0) {
    return { playerId: existing.value.rows[0].player_id };
  }

  // Link by exact display name (e.g. discovered from elo-history opponents)
  // to avoid a lookup request. Falls through to lookup when ambiguous.
  const key = username.trim().toLowerCase();
  const nameMatch = key.length > 0 ? nameIndex.get(key) : undefined;
  if (nameMatch != null) {
    const insert = await Query(
      `INSERT INTO eloshowdown_players (player_id, display_name, riftbound_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         riftbound_id = COALESCE(eloshowdown_players.riftbound_id, EXCLUDED.riftbound_id),
         last_seen_at = now()`,
      [nameMatch, username, String(riftboundId)],
    );
    if (insert.isErr()) throw insert.error;
    return { playerId: nameMatch };
  }

  try {
    const player = await lookupPlayer(riftboundId);
    const isSquad = squadMemberByPlayerId.has(player.id);
    const insert = await Query(
      `INSERT INTO eloshowdown_players
         (player_id, riftbound_id, display_name, community_tag, country, is_squad)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (player_id) DO UPDATE SET
         riftbound_id = EXCLUDED.riftbound_id,
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

    nameIndex.set(player.display_name.trim().toLowerCase(), player.id);
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
      await seedOpponents(points);
      return points;
    }
  }

  const response = await fetchEloHistory(playerId);
  const points = (response.points ?? []).sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() ||
      a.match_id - b.match_id,
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
  await seedOpponents(points);
  return points;
};

const SQUAD_REFRESH_MS = Config.eloshowdownSquadRefreshHours * 60 * 60 * 1000;

// Re-fetches elo history for tracked community players whose stored history is
// stale. Prioritizes players who played most recently (their elo is the most
// likely to have been recomputed by EloShowdown and is what the leaderboard
// shows), then oldest-fetched first within that, using the run's request
// budget.
const refreshStaleElos = async (): Promise<number> => {
  const result = await Query<{ player_id: number }>(
    `SELECT q.player_id
     FROM (
       SELECT ep.eloshowdown_player_id AS player_id, MAX(e.starts_at) AS last_event_start
       FROM rb_event_participants ep
       JOIN rb_events e ON e.id = ep.event_id
       WHERE e.is_local AND ep.eloshowdown_player_id IS NOT NULL
       GROUP BY ep.eloshowdown_player_id
     ) q
     JOIN eloshowdown_players p ON p.player_id = q.player_id
     WHERE p.elo_updated_at IS NULL
        OR p.elo_updated_at < now() - ($1::int * interval '1 hour')
     ORDER BY q.last_event_start DESC NULLS LAST, p.elo_updated_at ASC NULLS FIRST
     LIMIT $2`,
    [Config.eloshowdownStaleRefreshHours, 100],
  );
  if (result.isErr()) throw result.error;

  let refreshed = 0;
  for (const { player_id } of result.value.rows) {
    try {
      await ensureEloHistory(player_id);
      refreshed++;
    } catch (error) {
      if (error instanceof BudgetExceededError) break;
      if (error instanceof EloShowdownApiError && error.status === 429) break;
      throw error;
    }
  }
  return refreshed;
};

export interface RefreshElosResult {
  refreshed: number;
  requestsUsed: number;
  stoppedEarly: boolean;
}

export interface RegistrantToHydrate {
  riftboundId: string;
  username: string;
}

export interface HydrateRegistrantsResult {
  refreshed: number;
  unresolved: number;
  requestsUsed: number;
  stoppedEarly: boolean;
}

/**
 * Standalone refresh of stale tracked players' elo histories, for the
 * dedicated cron job. Runs independently of the events backfill, resetting
 * run state so it never interferes with processOttawaEvents.
 */
export async function refreshStalePlayerElos(): Promise<RefreshElosResult> {
  eloHistoryCache.clear();
  resetRequestCount();
  counters.playersMapped = 0;
  counters.eloHistoriesFetched = 0;

  await buildNameIndex();

  let refreshed = 0;
  let stoppedEarly = false;
  try {
    refreshed = await refreshStaleElos();
  } catch (error) {
    if (
      error instanceof BudgetExceededError ||
      (error instanceof EloShowdownApiError && error.status === 429)
    ) {
      stoppedEarly = true;
    } else {
      throw error;
    }
  }

  logger.info(
    `Stale elo refresh: ${refreshed} refreshed, ${getRequestCount()} requests used` +
      `${stoppedEarly ? ' (stopped early)' : ''}`,
  );
  return {
    refreshed,
    requestsUsed: getRequestCount(),
    stoppedEarly,
  };
}

/**
 * Looks up registrants that are missing cached elo data and stores their
 * EloShowdown profiles and histories. A registrant remains unresolved when
 * no matching profile or usable elo history is available.
 */
export async function hydrateRegistrants(
  registrants: RegistrantToHydrate[],
): Promise<HydrateRegistrantsResult> {
  eloHistoryCache.clear();
  resetRequestCount();
  counters.playersMapped = 0;
  counters.eloHistoriesFetched = 0;

  await buildNameIndex();

  const uniqueRegistrants = Array.from(
    new Map(
      registrants.map((registrant) => [registrant.riftboundId, registrant]),
    ).values(),
  );
  let refreshed = 0;
  let unresolved = 0;
  let stoppedEarly = false;

  for (const registrant of uniqueRegistrants) {
    try {
      const mapping = await ensurePlayer(
        registrant.riftboundId,
        registrant.username,
      );
      if (!mapping) {
        unresolved++;
        continue;
      }

      const history = await ensureEloHistory(mapping.playerId);
      if (history.length > 0) {
        refreshed++;
      } else {
        unresolved++;
      }
    } catch (error) {
      if (
        error instanceof BudgetExceededError ||
        (error instanceof EloShowdownApiError && error.status === 429)
      ) {
        stoppedEarly = true;
        break;
      }
      unresolved++;
      logger.warn(
        { error, riftboundId: registrant.riftboundId },
        'Failed to hydrate event registrant elo',
      );
    }
  }

  return {
    refreshed,
    unresolved,
    requestsUsed: getRequestCount(),
    stoppedEarly,
  };
}

const ensureSquadPlayers = async (): Promise<void> => {
  for (const member of squadMembers) {
    try {
      const existingResult = await Query<{
        display_name: string | null;
        elo_updated_at: Date | null;
      }>(
        'SELECT display_name, elo_updated_at FROM eloshowdown_players WHERE player_id = $1',
        [member.eloShowdownId],
      );
      if (existingResult.isErr()) throw existingResult.error;
      const row = existingResult.value.rows[0];
      const fresh =
        row != null &&
        row.elo_updated_at != null &&
        Date.now() - new Date(row.elo_updated_at).getTime() < SQUAD_REFRESH_MS;

      if (fresh) continue;

      if (row == null || !row.display_name) {
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
        nameIndex.set(player.display_name.trim().toLowerCase(), player.id);
      } else {
        await Query(
          `UPDATE eloshowdown_players SET is_squad = true, last_seen_at = now()
           WHERE player_id = $1`,
          [member.eloShowdownId],
        );
      }

      // Refresh elo (also seeds the name index with this member's opponents).
      await ensureEloHistory(member.eloShowdownId);
    } catch (error) {
      if (error instanceof BudgetExceededError) throw error;
      if (error instanceof EloShowdownApiError && error.status === 429)
        throw error;
      logger.warn(
        { error, playerId: member.eloShowdownId },
        `Failed to sync squad member`,
      );
    }
  }
};

const updateEventElo = async (
  eventId: string,
  eloComplete: boolean,
): Promise<void> => {
  const result = await Query(
    `UPDATE rb_events
     SET elo_complete = $2, elo_processed_at = now(), updated_at = now()
     WHERE id = $1`,
    [eventId, eloComplete],
  );
  if (result.isErr()) throw result.error;
};

const updateParticipantElos = async (
  eventId: string,
  rows: { teamId: string; playerId: number; elo: EventElo }[],
): Promise<void> => {
  if (rows.length === 0) return;
  const result = await Query(
    `UPDATE rb_event_participants AS ep
     SET eloshowdown_player_id = v.player_id,
         elo_before = v.elo_before,
         elo_after = v.elo_after,
         elo_change = v.elo_change
     FROM (
       SELECT unnest($2::text[]) AS team_id,
              unnest($3::int[]) AS player_id,
              unnest($4::int[]) AS elo_before,
              unnest($5::int[]) AS elo_after,
              unnest($6::int[]) AS elo_change
     ) v
     WHERE ep.event_id = $1 AND ep.esports_team_id = v.team_id`,
    [
      eventId,
      rows.map((row) => row.teamId),
      rows.map((row) => row.playerId),
      rows.map((row) => row.elo.eloBefore),
      rows.map((row) => row.elo.eloAfter),
      rows.map((row) =>
        row.elo.eloBefore != null && row.elo.eloAfter != null
          ? row.elo.eloAfter - row.elo.eloBefore
          : null,
      ),
    ],
  );
  if (result.isErr()) throw result.error;
};

const EVENT_WINDOW_CAP_MS = 12 * 60 * 60 * 1000;

/**
 * Processes a single synced event. If the run's EloShowdown request budget is
 * hit mid-event, the event stays incomplete and is retried on a later run.
 */
const processEvent = async (
  event: SyncedEvent,
): Promise<ProcessEventResult> => {
  const participantsResult = await Query<{
    esports_team_id: string;
    player_id: string;
    display_name: string;
  }>(
    `SELECT esports_team_id, player_id, display_name
     FROM rb_event_participants
     WHERE event_id = $1 AND final_rank IS NOT NULL`,
    [event.id],
  );
  if (participantsResult.isErr()) throw participantsResult.error;
  const participants = participantsResult.value.rows;

  if (participants.length === 0) {
    await updateEventElo(event.id, true);
    logger.warn(`Event ${event.id} (${event.name}) has no standings; recorded`);
    return {
      completed: true,
      participants: 0,
      processedPlayers: 0,
      eloComplete: true,
    };
  }

  const start = new Date(event.starts_at);
  const rawEnd = event.ends_at ? new Date(event.ends_at) : start;
  const end = new Date(
    Math.min(rawEnd.getTime(), start.getTime() + EVENT_WINDOW_CAP_MS),
  );

  const processed: {
    teamId: string;
    playerId: number;
    elo: EventElo;
  }[] = [];
  for (const participant of participants) {
    if (!participant.player_id) continue;

    const mapping = await ensurePlayer(
      participant.player_id,
      participant.display_name,
    );
    if (!mapping) continue;

    const history = await ensureEloHistory(mapping.playerId, end);
    processed.push({
      teamId: participant.esports_team_id,
      playerId: mapping.playerId,
      elo: computeEventElo(history, start, end),
    });
  }

  const eloComplete =
    processed.length > 0 && processed.every((row) => row.elo.eloAfter != null);

  await updateEventElo(event.id, eloComplete);
  await updateParticipantElos(event.id, processed);

  logger.info(
    `Processed event ${event.id} (${event.name}) with ${processed.length}/${participants.length} participants${eloComplete ? '' : ' (elo incomplete)'}`,
  );
  return {
    completed: true,
    participants: participants.length,
    processedPlayers: processed.length,
    eloComplete,
  };
};

export async function processOttawaEvents(
  options: ProcessOttawaEventsOptions = {},
): Promise<ProcessResult> {
  const maxEvents = options.maxEvents ?? Config.ottawaMaxEventsPerRun;
  eloHistoryCache.clear();
  resetRequestCount();
  counters.playersMapped = 0;
  counters.eloHistoriesFetched = 0;

  await buildNameIndex();

  let eventsProcessed = 0;
  let eventsRemaining = 0;
  let stoppedEarly = false;
  let staleElosRefreshed = 0;

  try {
    await ensureSquadPlayers();
  } catch (error) {
    if (
      error instanceof BudgetExceededError ||
      (error instanceof EloShowdownApiError && error.status === 429)
    ) {
      logger.warn(
        'EloShowdown budget/rate limit hit during squad sync; stopping run',
      );
      stoppedEarly = true;
    } else {
      throw error;
    }
  }

  if (!stoppedEarly) {
    const events = await getEligibleEvents();
    eventsRemaining = Math.max(0, events.length - maxEvents);

    for (const event of events.slice(0, maxEvents)) {
      try {
        const completed = await processEvent(event);
        if (!completed.completed) {
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

  // Keep current_elo fresh for tracked players whose stored history predates
  // EloShowdown's latest computations, using leftover request budget.
  if (getRequestCount() < Config.eloshowdownMaxRequestsPerRun) {
    try {
      staleElosRefreshed = await refreshStaleElos();
    } catch (error) {
      if (
        error instanceof BudgetExceededError ||
        (error instanceof EloShowdownApiError && error.status === 429)
      ) {
        logger.info(
          'EloShowdown budget/rate limit hit during stale elo refresh',
        );
      } else {
        throw error;
      }
    }
  }

  const result: ProcessResult = {
    eventsProcessed,
    eventsRemaining,
    playersMapped: counters.playersMapped,
    eloHistoriesFetched: counters.eloHistoriesFetched,
    staleElosRefreshed,
    requestsUsed: getRequestCount(),
    stoppedEarly,
  };

  logger.info(
    `Ottawa events job: ${result.eventsProcessed} processed, ${result.eventsRemaining} remaining, ` +
      `${result.staleElosRefreshed} stale elos refreshed, ${result.requestsUsed} requests used` +
      `${result.stoppedEarly ? ' (stopped early)' : ''}`,
  );
  return result;
}

/**
 * Ingests a live snapshot of one event by id (page fetch + DB write) and
 * records its elo. Works for any event, including ones outside the Ottawa
 * search radius. Skips the squad sync so the request budget is reserved for
 * the event's players.
 */
export async function processOttawaEventById(
  eventId: string,
): Promise<ProcessSingleEventResult> {
  const event = await ingestEventById(eventId);

  eloHistoryCache.clear();
  resetRequestCount();
  counters.playersMapped = 0;
  counters.eloHistoriesFetched = 0;

  await buildNameIndex();

  let result: ProcessEventResult;
  try {
    result = await processEvent(event);
  } catch (error) {
    if (
      error instanceof BudgetExceededError ||
      (error instanceof EloShowdownApiError && error.status === 429)
    ) {
      logger.warn(
        'EloShowdown budget/rate limit hit while processing event; stopping',
      );
      return {
        eventName: event.name,
        participants: 0,
        processedPlayers: 0,
        eloComplete: false,
        stoppedEarly: true,
        requestsUsed: getRequestCount(),
      };
    }
    throw error;
  }

  logger.info(
    `Single event processed: ${event.name} with ${result.processedPlayers}/${result.participants} participants` +
      `${result.eloComplete ? '' : ' (elo incomplete)'}${result.completed ? '' : ' (stopped early)'}`,
  );

  return {
    eventName: event.name,
    participants: result.participants,
    processedPlayers: result.processedPlayers,
    eloComplete: result.eloComplete,
    stoppedEarly: !result.completed,
    requestsUsed: getRequestCount(),
  };
}
