import { logger } from 'src/lib/logger';

import { fetchAllStandings, fetchEventDetails } from './client';
import {
  ScrapeResult,
  UVSEventData,
  UVSRoundResultItem,
  UVSTournamentPhase,
  UVSTournamentRound,
} from './types';

const getTopCutSize = (totalPlayers: number): number => {
  if (totalPlayers > 15) return 8;
  if (totalPlayers >= 9) return 4;
  return 0;
};

const findActivePhase = (
  phases: UVSTournamentPhase[],
): { activePhase: UVSTournamentPhase; generatedRounds: UVSTournamentRound[] } => {
  for (let i = phases.length - 1; i >= 0; i--) {
    const phase = phases[i];
    const genRoundsInPhase = phase.rounds.filter(
      (r) => r.standings_status === 'GENERATED',
    );
    if (genRoundsInPhase.length > 0) {
      return { activePhase: phase, generatedRounds: genRoundsInPhase };
    }
  }
  return { activePhase: phases[0], generatedRounds: [] };
};

export async function scrapePlayerData(eventId: number): Promise<ScrapeResult> {
  logger.info(`Starting scraper for event ${eventId}...`);
  const eventData = await fetchEventDetails(eventId);
  logger.info(`Event loaded: "${eventData.name}"`);

  const sortedPhases = [...eventData.tournament_phases].sort(
    (a, b) => a.order_in_phases - b.order_in_phases,
  );

  // The event structure declares the cut: the first phase with a
  // rank_required_to_enter_phase (e.g. RANKED_SINGLE_ELIMINATION) is the top cut.
  const cutPhases = sortedPhases.filter(
    (phase) => phase.rank_required_to_enter_phase != null,
  );
  const firstCutIndex = sortedPhases.findIndex(
    (phase) => phase.rank_required_to_enter_phase != null,
  );
  const firstCutPhase =
    firstCutIndex >= 0 ? sortedPhases[firstCutIndex] : undefined;
  const cuttingPhase =
    firstCutIndex > 0 ? sortedPhases[firstCutIndex - 1] : undefined;
  const eventTopCutSize = firstCutPhase?.rank_required_to_enter_phase;

  const totalSwissRounds = sortedPhases
    .slice(0, firstCutIndex >= 0 ? firstCutIndex : sortedPhases.length)
    .reduce((sum, phase) => sum + (phase.number_of_rounds ?? 0), 0);

  const { activePhase, generatedRounds } = findActivePhase(sortedPhases);

  const phaseName = activePhase?.phase_name ?? 'Phase 1';
  const totalPhaseRounds = activePhase
    ? (activePhase.number_of_rounds ?? activePhase.rounds.length)
    : 0;
  const lowerPhaseName = phaseName.toLowerCase();

  const isDay2 = lowerPhaseName.includes('day 2') || activePhase?.order_in_phases === 2;
  const isElimination =
    activePhase != null && cutPhases.some((phase) => phase.id === activePhase.id);
  const isCuttingPhase =
    activePhase != null &&
    cuttingPhase != null &&
    activePhase.id === cuttingPhase.id;

  if (generatedRounds.length === 0) {
    logger.warn('No rounds with generated standings found for this event.');
    return {
      players: [],
      event: eventData,
      currentRound: 0,
      displayRound: 0,
      totalRounds: totalPhaseRounds,
      roundsRemaining: 0,
      isComplete: false,
      isCutDecided: false,
      latestRoundStatus: 'NOT_STARTED',
      phaseName,
      isDay2,
      isElimination,
      isCuttingPhase,
      totalSwissRounds,
      topCutSize: eventTopCutSize ?? 0,
      activePhase,
      allPhases: sortedPhases,
    };
  }

  const latestRound = generatedRounds[generatedRounds.length - 1];
  logger.info(`Fetching standings for Round ${latestRound.round_number} (${phaseName})`);

  const rawResults = await fetchAllStandings(latestRound.id);

  const players = rawResults.map((item: UVSRoundResultItem) => ({
    rank: String(item.rank),
    username:
      item.user_event_status?.best_identifier ??
      item.player?.best_identifier ??
      'Unknown',
    legend: item.user_event_status?.deck_defining_card?.name ?? '',
    points: item.points ?? item.match_points ?? 0,
    record: item.record ?? '',
    omw: item.opponent_match_win_percentage ?? 0,
    gw: item.game_win_percentage ?? 0,
    ogw: item.opponent_game_win_percentage ?? 0,
    status: item.user_event_status?.registration_status ?? 'ACTIVE',
  }));

  const topCutSize = eventTopCutSize ?? getTopCutSize(players.length);

  const allRounds = sortedPhases.flatMap((phase) => phase.rounds);
  const eventRoundsRemaining = allRounds.filter(
    (r) => r.round_number > latestRound.round_number,
  ).length;
  const isComplete =
    eventRoundsRemaining === 0 && latestRound.status === 'COMPLETE';

  // Rounds left within the active phase only — future phases (e.g. the
  // elimination phase after the cut) don't count toward the current round.
  const roundsRemaining = activePhase.rounds.filter(
    (r) => r.round_number > latestRound.round_number,
  ).length;

  // The cut is decided once the Swiss phase feeding it has run all its rounds.
  // This matters in the window after the last Swiss round completes but before
  // the elimination phase posts its own standings.
  const activePhaseRoundNumbers = activePhase.rounds.map((round) => round.round_number);
  const isCutDecided =
    isCuttingPhase &&
    activePhaseRoundNumbers.length > 0 &&
    latestRound.round_number >= Math.max(...activePhaseRoundNumbers) &&
    latestRound.status === 'COMPLETE';

  // Show the round number relative to the active phase. Round numbers are
  // event-wide; use the phase's own rounds when present (works for elimination
  // phases whose rounds are numbered after prior phases), otherwise fall back
  // to summing prior phases' round counts.
  const activePhaseIndex = sortedPhases.findIndex(
    (phase) => phase.id === activePhase.id,
  );
  const phaseRoundNumbers = activePhase.rounds.map((round) => round.round_number);
  const phaseStartRound =
    phaseRoundNumbers.length > 0
      ? Math.min(...phaseRoundNumbers)
      : sortedPhases
          .slice(0, activePhaseIndex)
          .reduce((sum, phase) => sum + (phase.number_of_rounds ?? 0), 0) + 1;
  const displayRound = Math.max(1, latestRound.round_number - phaseStartRound + 1);

  return {
    players,
    event: eventData,
    currentRound: latestRound.round_number,
    displayRound,
    totalRounds: totalPhaseRounds,
    roundsRemaining,
    isComplete,
    isCutDecided,
    latestRoundStatus: latestRound.status,
    phaseName,
    isDay2,
    isElimination,
    isCuttingPhase,
    totalSwissRounds,
    topCutSize,
    activePhase,
    allPhases: sortedPhases,
  };
}

export function timerStatusLabel(data: ScrapeResult): string {
  const { event, isComplete, latestRoundStatus } = data;

  if (!isComplete && event.timer_is_running && event.timer_end_datetime) {
    const endsAt = new Date(event.timer_end_datetime);
    const diffMs = endsAt.getTime() - Date.now();

    if (diffMs > 0) {
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      return `Round timer: RUNNING - ${mins}m ${secs}s remaining (ends at ${endsAt.toLocaleTimeString()})`;
    }
    return `Round timer: TIME IS UP (ended at ${endsAt.toLocaleTimeString()})`;
  }

  if (isComplete) return 'Round timer: PHASE FINISHED';
  if (latestRoundStatus === 'COMPLETE') {
    return 'Round timer: ROUND COMPLETE (Waiting for next round)';
  }
  return 'Round timer: NOT RUNNING';
}

export interface EventParticipant {
  userId: number;
  username: string;
  rank: number;
  record: string;
  points: number;
  status: string;
}

export async function fetchEventParticipants(
  eventId: number,
): Promise<{ event: UVSEventData; participants: EventParticipant[] }> {
  const eventData = await fetchEventDetails(eventId);
  const sortedPhases = [...eventData.tournament_phases].sort(
    (a, b) => a.order_in_phases - b.order_in_phases,
  );
  const { generatedRounds } = findActivePhase(sortedPhases);
  if (generatedRounds.length === 0) {
    return { event: eventData, participants: [] };
  }

  const latestRound = generatedRounds[generatedRounds.length - 1];
  const rawResults = await fetchAllStandings(latestRound.id);

  const participants = rawResults.map((item: UVSRoundResultItem) => ({
    userId: item.user_event_status?.user?.id ?? 0,
    username:
      item.user_event_status?.best_identifier ??
      item.player?.best_identifier ??
      'Unknown',
    rank: item.rank,
    record: item.record ?? '',
    points: item.points ?? item.match_points ?? 0,
    status: item.user_event_status?.registration_status ?? 'ACTIVE',
  }));

  return { event: eventData, participants };
}
