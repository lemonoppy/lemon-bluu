import fs from 'fs';
import process from 'process';

const USERS_OF_NOTE = [
  { username: 'badboijerbear', name: 'Jerry' },
  { username: 'Miss Play', name: 'Chloe' },
  { username: 'Sphere Itself', name: 'Sam' },
  { username: 'BNutty', name: 'Bennett' },
  { username: 'lolford', name: 'Luka' },
  { username: 'Nova', name: 'Ernest' }
];

// --- API Interfaces ---
export interface UVSDeckDefiningCard {
  id: string;
  name: string;
  image_url: string | null;
}

export interface UVSUser {
  id: number;
  pronouns: string | null;
  country_code: string | null;
}

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

export interface UVSPlayer {
  id: number;
  best_identifier: string;
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
  next_page_number: number | null;
  next: string | null;
  previous: string | null;
  previous_page_number: number | null;
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
  number_of_rounds: number;
  round_type: string;
  rounds: UVSTournamentRound[];
}

interface UVSEventData {
  id: number;
  start_datetime: string;
  end_datetime: string;
  timer_is_running: boolean;
  timer_end_datetime: string;
  name: string;
  store: {
    id: number;
    name: string;
  };
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
  totalRounds: number;
  isComplete: boolean;
  phaseName: string;
  isDay2: boolean;
}

// --- Configuration & Utilities ---
const API_BASE_URL = 'https://api.cloudflare.riftbound.uvsgames.com/hydraproxy/api/v2';

const getEventUrl = (eventId: number) => `${API_BASE_URL}/events/${eventId}/`;
const getRoundUrl = (roundId: number) =>
  `${API_BASE_URL}/tournament-rounds/${roundId}/standings/paginated/?page_size=1000`;

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

// Dependency-free CSV generator
function generateCSV(data: UVSResultData[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) =>
    Object.values(row)
      .map((val) => `"${String(val).replace(/"/g, '""')}"`) // Escape quotes
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

// --- Main Core Logic ---
async function scrapePlayerData(): Promise<ScrapeResult> {
  const eventId = resolveEventId();
  console.log(`Starting scraper for event ${eventId}...`);

  // 1. Fetch Event metadata
  const eventResponse = await fetch(getEventUrl(eventId));
  if (!eventResponse.ok) {
    throw new Error(`Failed to fetch event details: ${eventResponse.statusText}`);
  }

  const eventData = (await eventResponse.json()) as UVSEventData;
  console.log(`✓ Event loaded: "${eventData.name}"`);

  // 2. Locate all rounds across phases with generated standings
  const generatedRounds = eventData.tournament_phases
    .flatMap((phase) => phase.rounds)
    .filter((round) => round.standings_status === 'GENERATED');

  // Find the active phase containing generated rounds
  const activePhase = eventData.tournament_phases.find((phase) =>
    phase.rounds.some((r) => generatedRounds.some((gr) => gr.id === r.id))
  ) ?? eventData.tournament_phases[0];

  const totalPhaseRounds = activePhase?.number_of_rounds ?? 0;
  const phaseName = activePhase?.phase_name ?? 'Phase 1';
  const isDay2 = phaseName.toLowerCase().includes('day 2') || activePhase?.order_in_phases > 1;

  if (generatedRounds.length === 0) {
    console.warn('⚠️ No rounds with generated standings found for this event.');
    return {
      players: [],
      event: eventData,
      currentRound: 0,
      totalRounds: totalPhaseRounds,
      isComplete: false,
      phaseName,
      isDay2,
    };
  }

  // Pick the latest available complete round
  const latestRound = generatedRounds[generatedRounds.length - 1];
  console.log(`✓ Fetching standings for Round ${latestRound.round_number} (${phaseName})`);

  // 3. Fetch paginated standings payload via a while loop
  const allRawResults: UVSRoundResultItem[] = [];
  let currentUrl: string | null = getRoundUrl(latestRound.id);
  let pageNumber = 1;

  while (currentUrl) {
    const roundResponse = await fetch(currentUrl);

    if (!roundResponse.ok) {
      throw new Error(`Failed to fetch round standings on page ${pageNumber}: ${roundResponse.statusText}`);
    }

    const standingsData = (await roundResponse.json()) as UVSRoundStandingsPaginatedResponse;
    allRawResults.push(...(standingsData.results ?? []));

    currentUrl = standingsData.next;
    pageNumber++;
  }

  // 4. Map the aggregated API results directly to UVSResultData[]
  const players = allRawResults.map((item) => ({
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

  const isPhaseComplete = latestRound.round_number >= totalPhaseRounds && latestRound.status === 'COMPLETE';

  return {
    players,
    event: eventData,
    currentRound: latestRound.round_number,
    totalRounds: totalPhaseRounds,
    isComplete: isPhaseComplete,
    phaseName,
    isDay2,
  };
}

// --- Execution ---
scrapePlayerData()
  .then(({ players, event, currentRound, totalRounds, isComplete, phaseName, isDay2 }) => {
    console.log(`Total players: ${players.length}`);
    console.log(`Phase: ${phaseName} | Progress: Round ${currentRound} of ${totalRounds} ${isComplete ? '(COMPLETE)' : '(IN PROGRESS)'}\n`);

    // --- Round Timer Status ---
    if (!isComplete && event.timer_is_running && event.timer_end_datetime) {
      const endsAt = new Date(event.timer_end_datetime);
      const now = new Date();
      const diffMs = endsAt.getTime() - now.getTime();

      if (diffMs > 0) {
        const minutesLeft = Math.floor(diffMs / 60000);
        const secondsLeft = Math.floor((diffMs % 60000) / 1000);
        console.log(`⏱️  Round Timer: RUNNING - ${minutesLeft}m ${secondsLeft}s remaining (ends at ${endsAt.toLocaleTimeString()})`);
      } else {
        console.log(`⏱️  Round Timer: TIME IS UP (ended at ${endsAt.toLocaleTimeString()})`);
      }
    } else {
      console.log(`⏱️  Round Timer: ${isComplete ? 'PHASE FINISHED' : 'NOT RUNNING'}`);
    }

    fs.writeFileSync(`${event.id}_standings.json`, JSON.stringify(players, null, 2));
    fs.writeFileSync(`${event.id}_standings.csv`, generateCSV(players));

    // --- Find and log Users of Note ---
    console.log('\n--- 💪 Do Some Work Squad 💪 ---\n');

    // Find players whose username matches one in our USERS_OF_NOTE list (case-insensitive)
    const foundPlayers = players.filter((player) =>
      USERS_OF_NOTE.some(
        (u) => u.username.toLowerCase() === player.username.toLowerCase(),
      ),
    );

    if (foundPlayers.length > 0) {
      foundPlayers.forEach((player) => {
        const localUser = USERS_OF_NOTE.find(
          (u) => u.username.toLowerCase() === player.username.toLowerCase()
        );

        // Parse the record (Format: "W-L-D")
        const recordParts = player.record.split('-');
        const wins = parseInt(recordParts[0], 10) || 0;
        const losses = parseInt(recordParts[1], 10) || 0;
        const draws = parseInt(recordParts[2], 10) || 0;

        // Manually calculate points: 3 per win, 1 per draw
        const manualPoints = (wins * 3) + draws;
        const rankNum = parseInt(player.rank, 10) || 999;

        // ANSI Escape codes for terminal formatting
        const dimStrike = '\x1b[9m\x1b[2m'; // Strikethrough + Dim
        const reset = '\x1b[0m';
        const red = '\x1b[31m';
        const green = '\x1b[32m';
        const yellow = '\x1b[33m';
        const cyan = '\x1b[36m';
        const gray = '\x1b[90m';

        if (isDay2) {
          // --- DAY 2 LOGIC (TOP 8 CUT) ---
          if (rankNum <= 8) {
            console.log(
              `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints} ${cyan}[TOP 8 POSITION]${reset}`
            );
          } else if (isComplete && rankNum > 8) {
            console.log(
              `${dimStrike}• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints}${reset} ${gray}[MADE DAY 2 / MISSED TOP 8]${reset}`
            );
          } else {
            console.log(
              `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints} ${green}[CHASING TOP 8]${reset}`
            );
          }
        } else {
          // --- DAY 1 LOGIC (X-2 CUT) ---
          const roundsRemaining = Math.max(0, totalRounds - currentRound);
          const maxPossibleLosses = losses + roundsRemaining;
          const hasClinched = maxPossibleLosses <= 2;
          const droppedPoints = (losses * 3) + (draws * 2);
          const isEliminated = droppedPoints > 6;

          if (isEliminated) {
            console.log(
              `${dimStrike}• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints}${reset} ${red}[OUT]${reset}`
            );
          } else if (isComplete || hasClinched) {
            console.log(
              `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints} ${cyan}[CLINCHED DAY 2]${reset}`
            );
          } else if (droppedPoints === 6) {
            console.log(
              `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints} ${yellow}[BUBBLE]${reset}`
            );
          } else {
            console.log(
              `• ${localUser?.name} (${player.username}): Rank ${player.rank} | Record: ${player.record} | Points: ${manualPoints} ${green}[LIVE]${reset}`
            );
          }
        }
      });
    } else {
      console.log('None of the tracked users were found in this event.');
    }
  })
  .catch((error) => {
    console.error('\n✗ Scraping failed:', error);
    process.exit(1);
  });