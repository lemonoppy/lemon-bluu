import fs from 'fs';
import process from 'process';

import { simulateSwissWithDraws } from './cut-finder';

// --- Configuration & Constants ---
const API_BASE_URL = 'https://api.cloudflare.riftbound.uvsgames.com/hydraproxy/api/v2';

const USERS_OF_NOTE = [
  { username: 'badboijerbear', name: 'Jerry' },
  { username: 'Miss Play', name: 'Chloe' },
  { username: 'Sphere Itself', name: 'Sam' },
  { username: 'BNutty', name: 'Bennett' },
  { username: 'lolford', name: 'Luka' },
  { username: 'Nova', name: 'Ernest' }
];

const COLORS = {
  dimStrike: '\x1b[9m\x1b[2m',
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// --- API Interfaces ---
export interface UVSDeckDefiningCard { id: string; name: string; image_url: string | null; }
export interface UVSUser { id: number; pronouns: string | null; country_code: string | null; }
export interface UVSPlayer { id: number; best_identifier: string; }

export interface UVSUserEventStatus {
  id: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  total_match_points: number;
  full_profile_picture_url: string | null;
  registration_status: string;
  best_identifier: string;
  is_guest: boolean;
  user: UVSUser;
  deck_defining_card: UVSDeckDefiningCard | null;
}

export interface UVSRoundResultItem {
  id: number;
  player: UVSPlayer;
  user_event_status: UVSUserEventStatus;
  round_number: number;
  rank: number;
  record: string;
  match_record: string;
  match_points: number;
  opponent_match_win_percentage: number;
  game_win_percentage: number;
  opponent_game_win_percentage: number;
  points: number;
}

export interface UVSRoundStandingsPaginatedResponse {
  page_size: number;
  count: number;
  total: number;
  current_page_number: number;
  next: string | null;
  results: UVSRoundResultItem[];
}

interface UVSTournamentRound {
  id: number;
  round_number: number;
  final_round_in_event: boolean;
  pairings_status: 'GENERATED' | 'NOT_GENERATED';
  standings_status: 'GENERATED' | 'NOT_GENERATED';
  round_type: string;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'UPCOMING';
}

interface UVSTournamentPhase {
  id: number;
  phase_name: string;
  status: string;
  order_in_phases: number;
  number_of_rounds: number | null;
  round_type: string;
  rank_required_to_enter_phase: number | null;
  rounds: UVSTournamentRound[];
}

interface UVSEventData {
  id: number;
  start_datetime: string;
  end_datetime: string;
  timer_is_running: boolean;
  timer_end_datetime: string;
  name: string;
  store: { id: number; name: string; };
  tournament_phases: UVSTournamentPhase[];
}

// --- Output Interfaces ---
export interface UVSResultData {
  rank: string;
  username: string;
  legend: string;
  points: number;
  record: string;
  omw: number;
  gw: number;
  ogw: number;
  status: string;
}

interface ScrapeResult {
  players: UVSResultData[];
  event: UVSEventData;
  currentRound: number;
  displayRound: number;
  totalRounds: number;
  roundsRemaining: number;
  isComplete: boolean;
  latestRoundStatus: string;
  phaseName: string;
  isDay2: boolean;
  isElimination: boolean;
  isCuttingPhase: boolean;
  totalSwissRounds: number;
  topCutSize: number;
  activePhase: UVSTournamentPhase;
  allPhases: UVSTournamentPhase[];
}

// --- Utilities ---
const fetchWithTimeout = (url: string, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
};

function resolveEventId(): number {
  const cliEventId = process.argv[2];
  if (!cliEventId) {
    console.error('Usage: yarn scrape <eventId>');
    process.exit(1);
  }

  const parsed = parseInt(cliEventId, 10);
  if (isNaN(parsed)) {
    console.error(`Invalid event id passed: ${cliEventId}`);
    process.exit(1);
  }
  return parsed;
}

function getTopCutSize(totalPlayers: number): number {
  if (totalPlayers > 15) return 8;
  if (totalPlayers >= 9) return 4;
  return 0;
}

// The event structure declares the cut: the first phase with a
// rank_required_to_enter_phase (e.g. RANKED_SINGLE_ELIMINATION) is the top cut.
function getEventTopCutSize(phases: UVSTournamentPhase[]): number | undefined {
  const firstCutPhase = phases.find(
    (phase) => phase.rank_required_to_enter_phase != null,
  );
  return firstCutPhase?.rank_required_to_enter_phase ?? undefined;
}

function generateCSV(data: UVSResultData[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) =>
    Object.values(row)
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

// --- Data Fetching ---
async function fetchEventDetails(eventId: number): Promise<UVSEventData> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/events/${eventId}/`);
  if (!response.ok) throw new Error(`Failed to fetch event details: ${response.statusText}`);
  return (await response.json()) as UVSEventData;
}

async function fetchAllStandings(roundId: number): Promise<UVSRoundResultItem[]> {
  const allResults: UVSRoundResultItem[] = [];
  let currentUrl: string | null = `${API_BASE_URL}/tournament-rounds/${roundId}/standings/paginated/?page_size=1000`;
  let pageNumber = 1;

  while (currentUrl) {
    const response = await fetchWithTimeout(currentUrl);
    if (!response.ok) throw new Error(`Failed to fetch standings on page ${pageNumber}: ${response.statusText}`);

    const data = (await response.json()) as UVSRoundStandingsPaginatedResponse;
    allResults.push(...(data.results ?? []));
    currentUrl = data.next;
    pageNumber++;
  }
  return allResults;
}

// --- Core Logic ---
async function scrapePlayerData(eventId: number): Promise<ScrapeResult> {
  console.log(`Starting scraper for event ${eventId}...`);
  const eventData = await fetchEventDetails(eventId);
  console.log(`✓ Event loaded: "${eventData.name}"`);

  const sortedPhases = [...eventData.tournament_phases].sort((a, b) => a.order_in_phases - b.order_in_phases);

  const cutPhases = sortedPhases.filter(phase => phase.rank_required_to_enter_phase != null);
  const firstCutIndex = sortedPhases.findIndex(phase => phase.rank_required_to_enter_phase != null);
  const cuttingPhase = firstCutIndex > 0 ? sortedPhases[firstCutIndex - 1] : undefined;
  const eventTopCutSize = getEventTopCutSize(sortedPhases);
  const totalSwissRounds =
    firstCutIndex >= 0
      ? sortedPhases.slice(0, firstCutIndex).reduce((sum, phase) => sum + (phase.number_of_rounds ?? 0), 0)
      : sortedPhases.reduce((sum, phase) => sum + (phase.number_of_rounds ?? 0), 0);

  // Find the most recently active phase with generated standings
  let activePhase = sortedPhases[0];
  let generatedRounds: UVSTournamentRound[] = [];

  for (let i = sortedPhases.length - 1; i >= 0; i--) {
    const phase = sortedPhases[i];
    const genRoundsInPhase = phase.rounds.filter(r => r.standings_status === 'GENERATED');
    if (genRoundsInPhase.length > 0) {
      activePhase = phase;
      generatedRounds = genRoundsInPhase;
      break;
    }
  }

  const phaseName = activePhase?.phase_name ?? 'Phase 1';
  const totalPhaseRounds = activePhase?.number_of_rounds ?? 0;
  const lowerPhaseName = phaseName.toLowerCase();

  const isDay2 = lowerPhaseName.includes('day 2') || activePhase?.order_in_phases === 2;
  const isElimination = activePhase != null && cutPhases.some(phase => phase.id === activePhase.id);
  const isCuttingPhase = activePhase != null && cuttingPhase != null && activePhase.id === cuttingPhase.id;

  if (generatedRounds.length === 0) {
    console.warn('⚠️ No rounds with generated standings found for this event.');
    return {
      players: [], event: eventData, currentRound: 0, displayRound: 0,
      totalRounds: totalPhaseRounds, roundsRemaining: 0, isComplete: false,
      latestRoundStatus: 'NOT_STARTED', phaseName, isDay2, isElimination,
      isCuttingPhase, totalSwissRounds, topCutSize: eventTopCutSize ?? 8,
      activePhase, allPhases: sortedPhases,
    };
  }

  const latestRound = generatedRounds[generatedRounds.length - 1];
  console.log(`✓ Fetching standings for Round ${latestRound.round_number} (${phaseName})`);

  const rawResults = await fetchAllStandings(latestRound.id);

  const players = rawResults.map((item) => ({
    rank: String(item.rank),
    username: item.user_event_status?.best_identifier ?? item.player?.best_identifier ?? 'Unknown',
    legend: item.user_event_status?.deck_defining_card?.name ?? '',
    points: item.points ?? item.match_points ?? 0,
    record: item.record ?? '',
    omw: item.opponent_match_win_percentage ?? 0,
    gw: item.game_win_percentage ?? 0,
    ogw: item.opponent_game_win_percentage ?? 0,
    status: item.user_event_status?.registration_status ?? 'ACTIVE',
  }));

  const topCutSize = eventTopCutSize ?? getTopCutSize(players.length);

  const roundsRemaining = activePhase.rounds.filter(r => r.round_number > latestRound.round_number).length;
  const isComplete = roundsRemaining === 0 && latestRound.status === 'COMPLETE';

  let displayRound = latestRound.round_number;
  if (isDay2 && sortedPhases.length > 1) {
    const day1RoundsCount = sortedPhases[0].number_of_rounds ?? 0;
    if (displayRound > day1RoundsCount) displayRound -= day1RoundsCount;
  }

  return {
    players, event: eventData, currentRound: latestRound.round_number,
    displayRound, totalRounds: totalPhaseRounds, roundsRemaining,
    isComplete, latestRoundStatus: latestRound.status, phaseName,
    isDay2, isElimination, isCuttingPhase, totalSwissRounds, topCutSize,
    activePhase, allPhases: sortedPhases,
  };
}

// --- Output & Logging ---
function printTimerStatus(event: UVSEventData, isComplete: boolean, roundStatus: string) {
  if (!isComplete && event.timer_is_running && event.timer_end_datetime) {
    const endsAt = new Date(event.timer_end_datetime);
    const diffMs = endsAt.getTime() - Date.now();

    if (diffMs > 0) {
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      console.log(`⏱️  Round Timer: RUNNING - ${mins}m ${secs}s remaining (ends at ${endsAt.toLocaleTimeString()})`);
    } else {
      console.log(`⏱️  Round Timer: TIME IS UP (ended at ${endsAt.toLocaleTimeString()})`);
    }
  } else {
    if (isComplete) {
      console.log(`⏱️  Round Timer: PHASE FINISHED`);
    } else if (roundStatus === 'COMPLETE') {
      console.log(`⏱️  Round Timer: ROUND COMPLETE (Waiting for next round)`);
    } else {
      console.log(`⏱️  Round Timer: NOT RUNNING`);
    }
  }
}

function evaluateSquadStatus(data: ScrapeResult) {
  const { players, currentRound, totalRounds, roundsRemaining, isComplete, isDay2, isElimination, isCuttingPhase, totalSwissRounds, topCutSize, allPhases } = data;
  const { dimStrike, reset, red, green, yellow, cyan, gray } = COLORS;

  const foundPlayers = players.filter(p => USERS_OF_NOTE.some(u => u.username.toLowerCase() === p.username.toLowerCase()));

  if (foundPlayers.length === 0) {
    console.log('None of the tracked users were found in this event.');
    return;
  }

  const day1Rounds = allPhases[0]?.number_of_rounds ?? 7;
  const day2CutThresholdPoints = (day1Rounds * 3) - 6; // 15 points

  const squadTotals = { wins: 0, losses: 0, draws: 0 };

  // Fetch the predicted threshold points dynamically
  let thresholdPoints: number | undefined;
  if (topCutSize > 0 && players.length > 0) {
    const simulatedRecords = simulateSwissWithDraws({
      playerCount: players.length,
      roundCount: totalSwissRounds > 0 ? totalSwissRounds : totalRounds,
      topCutSize: topCutSize,
      trials: 5000,
      drawWindow: 1,
    }).probabilityTable.filter(record => record.probabilityOfMakingCut > 0);
    thresholdPoints = simulatedRecords[simulatedRecords.length - 1]?.points;
  }

  foundPlayers.forEach((player) => {
    const localUser = USERS_OF_NOTE.find(u => u.username.toLowerCase() === player.username.toLowerCase());
    const [wins = 0, losses = 0, draws = 0] = player.record.split('-').map(Number);
    const manualPoints = (wins * 3) + draws;
    const rankNum = parseInt(player.rank, 10) || 999;

    squadTotals.wins += wins;
    squadTotals.losses += losses;
    squadTotals.draws += draws;

    const prefix = `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints}`;
    const day1Finished = currentRound > day1Rounds || (isDay2 && allPhases.length > 1);
    const madeDay2 = manualPoints >= day2CutThresholdPoints;

    // 1. Elimination phase: the cut is decided
    if (isElimination) {
      if (rankNum <= topCutSize) {
        console.log(`${prefix} ${cyan}[MADE TOP ${topCutSize} CUT / ACTIVE]${reset}`);
      } else {
        console.log(`${dimStrike}${prefix}${reset} ${gray}[MISSED TOP ${topCutSize} CUT]${reset}`);
      }
      return;
    }

    // 2. Final Swiss phase feeding the cut: chasing the top cut
    if (isCuttingPhase) {
      if (isComplete) {
        if (rankNum <= topCutSize) {
          console.log(`${prefix} ${cyan}[MADE TOP ${topCutSize} CUT / ACTIVE]${reset}`);
        } else {
          console.log(`${dimStrike}${prefix}${reset} ${gray}[MISSED TOP ${topCutSize} CUT]${reset}`);
        }
        return;
      }

      const maxWinOut = manualPoints + (roundsRemaining * 3);
      const maxDrawOut = manualPoints + roundsRemaining;

      if (rankNum <= topCutSize) {
        if (roundsRemaining === 1 && rankNum <= (topCutSize - 2)) {
          console.log(`${prefix} ${cyan}[SECURE / CAN DRAW IN]${reset}`);
        } else {
          console.log(`${prefix} ${cyan}[IN TOP ${topCutSize} POSITION]${reset}`);
        }
      } else if (thresholdPoints !== undefined && maxWinOut < thresholdPoints) {
        console.log(`${dimStrike}${prefix}${reset} ${red}[DEAD FOR TOP ${topCutSize}]${reset}`);
      } else if (thresholdPoints !== undefined && maxDrawOut >= thresholdPoints) {
        console.log(`${prefix} ${yellow}[LIVE TO WIN/DRAW INTO TOP ${topCutSize}]${reset}`);
      } else {
        console.log(`${prefix} ${green}[MUST WIN OUT FOR TOP ${topCutSize}]${reset}`);
      }
      return;
    }

    // 3. Day 1 / early Swiss processing
    const remainingDay1 = Math.max(0, day1Rounds - currentRound);
    const maxLosses = losses + remainingDay1;
    const droppedPoints = (losses * 3) + (draws * 2);

    if (day1Finished && !madeDay2) {
      console.log(`${dimStrike}${prefix}${reset} ${red}[MISSED DAY 2]${reset}`);
    } else if (droppedPoints > 6) {
      console.log(`${dimStrike}${prefix}${reset} ${red}[OUT FOR DAY 2 / TOP ${topCutSize}]${reset}`);
    } else if (isComplete || maxLosses <= 2) {
      console.log(`${prefix} ${cyan}[CLINCHED DAY 2]${reset}`);
    } else if (droppedPoints === 6 || remainingDay1 === 1) {
      console.log(`${prefix} ${yellow}[BUBBLE]${reset}`);
    } else {
      console.log(`${prefix} ${green}[LIVE]${reset}`);
    }
  });

  // Log Squad Summary
  const { wins, losses, draws } = squadTotals;
  const totalGames = wins + losses + draws;
  const winPercent = (100 * (wins + 0.5 * draws)) / totalGames;

  const totalPossiblePoints = totalGames * 3;
  const actualPoints = (wins * 3) + draws;
  const pointsPercent = (100 * actualPoints) / totalPossiblePoints;

  console.log(`\nCombined Squad Record: ${wins}-${losses}-${draws} (${winPercent.toFixed(2)}%)`);
  console.log(`Combined Squad Points: ${actualPoints}/${totalPossiblePoints} (${pointsPercent.toFixed(2)}%)\n`);
}

// --- Execution Entrypoint ---
async function main() {
  try {
    const eventId = resolveEventId();
    const result = await scrapePlayerData(eventId);

    console.log(`Total players: ${result.players.length} | Dynamic Cut Target: Top ${result.topCutSize}`);
    console.log(`Phase: ${result.phaseName} | Progress: Round ${result.displayRound} of ${result.totalRounds} (${result.roundsRemaining} rounds remaining) ${result.isComplete ? '(COMPLETE)' : '(IN PROGRESS)'}\n`);

    printTimerStatus(result.event, result.isComplete, result.latestRoundStatus);

    // Write file outputs
    fs.writeFileSync(`${eventId}_standings.json`, JSON.stringify(result.players, null, 2));
    fs.writeFileSync(`${eventId}_standings.csv`, generateCSV(result.players));

    console.log('\n--- 💪 Do Some Work Squad 💪 ---\n');
    evaluateSquadStatus(result);

  } catch (error) {
    console.error('\n✗ Scraping failed:', error);
    process.exit(1);
  }
}

main();