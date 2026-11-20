import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';

import {
  UVSEventData,
  UVSRoundResultItem,
  UVSTournamentPhase,
  UVSTournamentRound,
} from './types';

const REQUEST_TIMEOUT_MS = 20_000;
const SEARCH_PAGE_SIZE = 100;
const SEARCH_CLIENT_NAME = 'Esports Web';
const SEARCH_CLIENT_VERSION = '0a092a0';

// The site stores event end times as start + 24h, which is much later than the
// event actually finishes. Cap the elo window so a player's next-day event
// can't leak into this one's elo delta.
const MAX_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;

const fetchWithTimeout = (
  url: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
};

// Accepts either a bare event id or a playriftbound.com event URL.
export const extractEventId = (input: string): string | null => {
  const match =
    input.trim().match(/\/events\/(\d+)/) ?? input.trim().match(/^(\d+)$/);
  return match ? match[1] : null;
};

export interface RiftboundLocation {
  googlePlaceId?: string | null;
  formattedAddress?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  adminArea1?: string | null;
  adminArea2?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RiftboundOrganizer {
  id: string;
  name: string;
  physicalAddress?: RiftboundLocation | null;
  phone?: { countryDialingCode?: string; number?: string } | null;
}

export interface RiftboundEventSummary {
  id: string;
  name: string;
  startsAt: string;
  tournamentType: string | null;
  organizerId: string | null;
  organizerName: string | null;
  location: RiftboundLocation | null;
}

interface RiftboundSearchResponse {
  data?: {
    competeTournamentSearch: {
      edges: {
        node: {
          organizer: { id: string; name: string } | null;
          tournament: {
            id: string;
            name: string;
            startsAt: string;
            tournamentLocation: RiftboundLocation | null;
            config: { tournamentType: string | null } | null;
          };
        };
      }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: { message: string }[];
}

export async function fetchEventSummariesSince(
  startDate: string,
): Promise<RiftboundEventSummary[]> {
  const events: RiftboundEventSummary[] = [];
  let after: string | undefined;

  do {
    const variables: Record<string, unknown> = {
      sport: 'rb',
      first: SEARCH_PAGE_SIZE,
      filter: {
        rb: {
          coords: Config.ottawaCoords,
          startDate,
          distanceMeters: Config.ottawaSearchRadiusMeters,
        },
      },
      sortBy: { rb: 'DATE' },
    };
    if (after) variables.after = after;

    const query = new URLSearchParams({
      operationName: 'CompeteTournamentSearch',
      variables: JSON.stringify(variables),
      extensions: JSON.stringify({
        clientLibrary: { name: '@apollo/client', version: '4.1.9' },
        persistedQuery: {
          version: 1,
          sha256Hash: Config.riftboundSearchHash,
        },
      }),
    });

    try {
      const response = await fetchWithTimeout(
        `${Config.riftboundGqlUrl}?${query}`,
        {
          headers: {
            // Required by the endpoint's CSRF check even on GET.
            'content-type': 'application/json',
            accept: 'application/graphql-response+json,application/json;q=0.9',
            'apollographql-client-name': SEARCH_CLIENT_NAME,
            'apollographql-client-version': SEARCH_CLIENT_VERSION,
          },
        },
        REQUEST_TIMEOUT_MS * 2,
      );
      const body = (await response.json()) as RiftboundSearchResponse;
      if (!response.ok || body.errors?.length || !body.data) {
        throw new Error(
          `Failed to search Riftbound events: ${
            body.errors?.[0]?.message ?? response.statusText
          }`,
        );
      }

      const search = body.data.competeTournamentSearch;
      for (const edge of search.edges) {
        const { tournament, organizer } = edge.node;
        events.push({
          id: tournament.id,
          name: tournament.name,
          startsAt: tournament.startsAt,
          tournamentType: tournament.config?.tournamentType ?? null,
          organizerId: organizer?.id ?? null,
          organizerName: organizer?.name ?? null,
          location: tournament.tournamentLocation ?? null,
        });
      }

      after = search.pageInfo.hasNextPage
        ? (search.pageInfo.endCursor ?? undefined)
        : undefined;
    } catch (error) {
      logger.warn(
        { error },
        'Failed to fetch a Riftbound event search page; using partial results',
      );
      break;
    }
  } while (after);

  return events;
}

export interface RiftboundStanding {
  rank: number;
  esportsTeamId: string;
  matchPoints: number;
  opponentMatchWinPercentage: string | number;
  gameWinPercentage: string | number;
  opponentGameWinPercentage: string | number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
}

export interface RiftboundTeamOutcome {
  outcome: string;
  esportsTeamId: string;
}

export interface RiftboundGame {
  esportsGameId: string;
  number: number;
  teamOutcomes: RiftboundTeamOutcome[] | null;
}

export interface RiftboundTeam {
  esportsTeamId: string;
  players: { id: string; displayName: string; tagLine: string }[];
}

export interface RiftboundMatch {
  esportsMatchId: string;
  structuralId: string | null;
  tableNumber: number | null;
  status: string;
  strategy: string;
  teamOutcomes: RiftboundTeamOutcome[] | null;
  games: RiftboundGame[];
  teams: RiftboundTeam[];
}

export interface RiftboundRound {
  roundNumber: number;
  status: string;
  byeTeamIds: string[];
  startedAt: string | null;
  roundDuration: number | null;
  matches: RiftboundMatch[];
  endOfRoundStandings: RiftboundStanding[] | null;
}

export interface RiftboundSection {
  esportsSectionId: string;
  type: string;
  rounds: RiftboundRound[];
}

export interface RiftboundStage {
  esportsStageId: string;
  name: string | null;
  status: string;
  sections: RiftboundSection[];
}

export interface RiftboundTournament {
  id: string;
  name: string;
  organizerId?: string;
  startsAt: string;
  endsAt: string | null;
  updatedAt?: string;
  status: string;
  tournamentLocation?: RiftboundLocation | null;
  config: {
    tournamentType: string | null;
    structure: string | null;
    roundCount: number | null;
    secondSwissStage: { roundCount: number } | null;
    finalBracketStage: { participantCount: number } | null;
  } | null;
  stages: RiftboundStage[];
  tournamentParticipants: {
    status: string;
    esportsTeamId: string;
    player: { id: string; displayName: string; tagLine: string };
  }[];
}

export interface ParsedEventPage {
  tournament: RiftboundTournament;
  organizer: RiftboundOrganizer | null;
}

// Some events (usually casual nights with no results) render a reduced page
// without the full tournament model. They can never produce match history.
export class TournamentUnavailableError extends Error {}

const RSC_CHUNK = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;

// Concatenates the RSC flight payload that Next.js embeds in the server-
// rendered page. The tournament JSON lives inside it.
export const extractFlightPayload = (html: string): string => {
  let flight = '';
  for (const match of html.matchAll(RSC_CHUNK)) {
    try {
      flight += JSON.parse(match[1]) as string;
    } catch {
      // Ignore malformed chunks; the page has many unrelated ones.
    }
  }
  return flight;
};

const extractJson = <T>(
  text: string,
  start: number,
  open: string,
  close: string,
): T | null => {
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth++;
    else if (char === close && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1)) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const extractJsonObject = <T>(text: string, marker: string): T | null =>
  extractJson<T>(text, text.indexOf(marker), '{', '}');

export const parseEventPage = (html: string): ParsedEventPage => {
  const flight = extractFlightPayload(html);
  const tournament = extractJsonObject<RiftboundTournament>(
    flight,
    '{"__typename":"CompeteTournament"',
  );
  if (!tournament) {
    if (flight.includes('"__typename":"RiftboundTournamentConfig"')) {
      throw new TournamentUnavailableError(
        'Tournament data is not available for this event',
      );
    }
    throw new Error('Tournament data not found on Riftbound event page');
  }
  const organizer = extractJsonObject<RiftboundOrganizer>(
    flight,
    '{"__typename":"OrganizerSummary"',
  );
  return { tournament, organizer };
};

export interface RiftboundRegistrant {
  status: string;
  waitlistPosition?: number | null;
  player: { id: string; displayName: string; tagLine: string };
}

// Upcoming events don't render tournament data, but they do render the
// registrant list, which is enough to scout them before the first round.
export const parseEventRegistrants = (html: string): RiftboundRegistrant[] => {
  const flight = extractFlightPayload(html);
  const marker = flight.indexOf(
    '"players":[{"__typename":"TournamentRegistrant"',
  );
  if (marker < 0) return [];
  const start = flight.indexOf('[', marker);
  return extractJson<RiftboundRegistrant[]>(flight, start, '[', ']') ?? [];
};

const findEventHeader = (
  flight: string,
): { at: number; name: string } | null => {
  const marker = '["$","h1",null,';
  // The flight payload also carries Next.js's 404 template, whose h1 has a
  // numeric child. The event header is the first h1 with a text child.
  for (
    let at = flight.indexOf(marker);
    at >= 0;
    at = flight.indexOf(marker, at + 1)
  ) {
    const header = extractJson<{ children?: unknown }>(
      flight,
      flight.indexOf('{', at),
      '{',
      '}',
    );
    if (typeof header?.children === 'string' && header.children) {
      return { at, name: header.children };
    }
  }
  return null;
};

export const parseEventName = (html: string): string | null =>
  findEventHeader(extractFlightPayload(html))?.name ?? null;

// Upcoming events render a reduced page with no organizer data; the store is
// only the label span directly above the event title.
export const parseEventStoreName = (html: string): string | null => {
  const flight = extractFlightPayload(html);
  const header = findEventHeader(flight);
  if (!header) return null;

  const marker = '["$","span",null,';
  const windowStart = header.at - 500;
  for (
    let at = flight.lastIndexOf(marker, header.at);
    at >= windowStart;
    at = flight.lastIndexOf(marker, at - 1)
  ) {
    const span = extractJson<{ children?: unknown }>(
      flight,
      flight.indexOf('{', at),
      '{',
      '}',
    );
    if (typeof span?.children === 'string' && span.children) {
      return span.children;
    }
  }
  return null;
};

const mapRoundStatus = (status: string): UVSTournamentRound['status'] => {
  if (status === 'FINALIZED') return 'COMPLETE';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'UPCOMING';
};

const buildPhases = (tournament: RiftboundTournament): UVSTournamentPhase[] => {
  const participantsByTeam = new Map(
    tournament.tournamentParticipants.map((participant) => [
      participant.esportsTeamId,
      participant,
    ]),
  );
  const topCutSize =
    tournament.config?.finalBracketStage?.participantCount ?? 0;
  const phases: UVSTournamentPhase[] = [];
  let roundNumber = 0;
  let swissSections = 0;

  const mapStandings = (round: RiftboundRound): UVSRoundResultItem[] =>
    (round.endOfRoundStandings ?? []).map((standing, index) => {
      const participant = participantsByTeam.get(standing.esportsTeamId);
      const username = participant?.player.displayName ?? 'Unknown';
      return {
        id: index,
        player: { id: 0, best_identifier: username },
        user_event_status: {
          id: index,
          matches_won: standing.matchWins,
          matches_drawn: standing.matchDraws,
          matches_lost: standing.matchLosses,
          total_match_points: standing.matchPoints,
          full_profile_picture_url: null,
          registration_status: participant?.status ?? 'ACTIVE',
          best_identifier: username,
          is_guest: false,
          user: {
            id: participant?.player.id ?? '',
            pronouns: null,
            country_code: null,
          },
          deck_defining_card: null,
        },
        round_number: roundNumber,
        rank: standing.rank,
        record: `${standing.matchWins}-${standing.matchLosses}-${standing.matchDraws}`,
        match_record: `${standing.matchWins}-${standing.matchLosses}-${standing.matchDraws}`,
        match_points: standing.matchPoints,
        opponent_match_win_percentage: Number(
          standing.opponentMatchWinPercentage,
        ),
        game_win_percentage: Number(standing.gameWinPercentage),
        opponent_game_win_percentage: Number(
          standing.opponentGameWinPercentage,
        ),
        points: standing.matchPoints,
      };
    });

  for (const stage of tournament.stages) {
    for (const section of stage.sections) {
      const isElimination =
        section.type === 'SINGLE_ELIM' || section.type.includes('BRACKET');
      const rounds = section.rounds.map((round): UVSTournamentRound => {
        roundNumber++;
        const standings = mapStandings(round);
        return {
          id: roundNumber,
          round_number: roundNumber,
          final_round_in_event: false,
          pairings_status:
            round.matches.length > 0 ? 'GENERATED' : 'NOT_GENERATED',
          standings_status:
            round.endOfRoundStandings != null ? 'GENERATED' : 'NOT_GENERATED',
          round_type: section.type,
          status: mapRoundStatus(round.status),
          standings,
        };
      });

      // The site only creates a round once pairings are generated, but the
      // squad logic needs the whole planned Swiss schedule.
      if (!isElimination) {
        const planned =
          swissSections === 0
            ? (tournament.config?.roundCount ?? 0)
            : (tournament.config?.secondSwissStage?.roundCount ??
              tournament.config?.roundCount ??
              0);
        swissSections++;
        for (let n = rounds.length + 1; n <= planned; n++) {
          roundNumber++;
          rounds.push({
            id: roundNumber,
            round_number: roundNumber,
            final_round_in_event: false,
            pairings_status: 'NOT_GENERATED',
            standings_status: 'NOT_GENERATED',
            round_type: section.type,
            status: 'UPCOMING',
            standings: [],
          });
        }
      }

      phases.push({
        id: phases.length + 1,
        phase_name: isElimination ? 'Top Cut' : `Phase ${phases.length + 1}`,
        status: stage.status,
        order_in_phases: phases.length + 1,
        number_of_rounds: rounds.length,
        round_type: section.type,
        rank_required_to_enter_phase: isElimination ? topCutSize : null,
        rounds,
      });
    }
  }

  const hasCutPhase = phases.some(
    (phase) => phase.rank_required_to_enter_phase != null,
  );
  const structure = tournament.config?.structure ?? '';
  if (
    !hasCutPhase &&
    topCutSize > 0 &&
    (structure.includes('ELIM') || structure.includes('BRACKET'))
  ) {
    // The site doesn't create the bracket stage until the cut is set, so add
    // the future cut phase for the scraper's cut logic.
    phases.push({
      id: phases.length + 1,
      phase_name: 'Top Cut',
      status: 'UPCOMING',
      order_in_phases: phases.length + 1,
      number_of_rounds: 0,
      round_type: 'SINGLE_ELIM',
      rank_required_to_enter_phase: topCutSize,
      rounds: [],
    });
  }

  const lastPhase = phases[phases.length - 1];
  const lastRound = lastPhase?.rounds[lastPhase.rounds.length - 1];
  if (lastRound) lastRound.final_round_in_event = true;

  return phases;
};

const getActiveRound = (
  tournament: RiftboundTournament,
): RiftboundRound | null => {
  let active: RiftboundRound | null = null;
  for (const stage of tournament.stages) {
    for (const section of stage.sections) {
      for (const round of section.rounds) {
        if (round.status === 'IN_PROGRESS') active = round;
      }
    }
  }
  return active;
};

export const buildEventData = ({
  tournament,
  organizer,
}: ParsedEventPage): UVSEventData => {
  const startMs = new Date(tournament.startsAt).getTime();
  const endMs = tournament.endsAt
    ? Math.min(
        new Date(tournament.endsAt).getTime(),
        startMs + MAX_EVENT_WINDOW_MS,
      )
    : null;
  const activeRound = getActiveRound(tournament);
  const timerEnd =
    activeRound?.startedAt && activeRound.roundDuration != null
      ? new Date(
          new Date(activeRound.startedAt).getTime() +
            activeRound.roundDuration * 60 * 1000,
        ).toISOString()
      : '';

  return {
    id: tournament.id,
    start_datetime: tournament.startsAt,
    end_datetime: endMs != null ? new Date(endMs).toISOString() : null,
    timer_is_running: timerEnd !== '',
    timer_end_datetime: timerEnd,
    name: tournament.name,
    store: { id: 0, name: organizer?.name ?? '' },
    tournament_phases: buildPhases(tournament),
  };
};

const fetchEventPage = async (eventId: string): Promise<string> => {
  const response = await fetchWithTimeout(
    `${Config.riftboundBaseUrl}/en-US/events/${eventId}`,
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      },
    },
    REQUEST_TIMEOUT_MS * 2,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch event ${eventId}: ${response.statusText}`);
  }
  return response.text();
};

export const fetchParsedEvent = async (
  eventId: string,
): Promise<ParsedEventPage> => {
  const parsed = parseEventPage(await fetchEventPage(eventId));
  logger.info(
    `Loaded Riftbound event "${parsed.tournament.name}" (${eventId})`,
  );
  return parsed;
};

export async function fetchEventDetails(
  eventId: string,
): Promise<UVSEventData> {
  const html = await fetchEventPage(eventId);
  try {
    return buildEventData(parseEventPage(html));
  } catch (error) {
    if (!(error instanceof TournamentUnavailableError)) throw error;
    // Not started yet: the reduced page only carries the event name.
    return {
      id: eventId,
      start_datetime: '',
      end_datetime: null,
      timer_is_running: false,
      timer_end_datetime: '',
      name: parseEventName(html) ?? `Event ${eventId}`,
      store: { id: 0, name: parseEventStoreName(html) ?? '' },
      tournament_phases: [],
    };
  }
}

export interface UVSEventRegistration {
  id: number;
  user: {
    id: string;
    best_identifier: string;
    pronouns: string | null;
    country_code: string | null;
  };
  registration_status: string;
  best_identifier: string;
  is_guest: boolean;
  matches_won: number;
  matches_lost: number;
  matches_drawn: number;
  total_match_points: number;
  final_place_in_standings: number | null;
}

const toRegistration = (
  index: number,
  player: { id: string; displayName: string },
  registrationStatus: string,
): UVSEventRegistration => ({
  id: index,
  user: {
    id: player.id,
    best_identifier: player.displayName,
    pronouns: null,
    country_code: null,
  },
  registration_status: registrationStatus,
  best_identifier: player.displayName,
  is_guest: false,
  matches_won: 0,
  matches_lost: 0,
  matches_drawn: 0,
  total_match_points: 0,
  final_place_in_standings: null,
});

// The event page lists every participant, including drops; the scout command
// only cares about the players who are still active.
export async function fetchEventRegistrations(
  eventId: string,
): Promise<UVSEventRegistration[]> {
  const html = await fetchEventPage(eventId);
  try {
    const { tournament } = parseEventPage(html);
    return tournament.tournamentParticipants.map((participant, index) =>
      toRegistration(
        index,
        participant.player,
        participant.status === 'ACTIVE' ? 'COMPLETE' : participant.status,
      ),
    );
  } catch (error) {
    if (!(error instanceof TournamentUnavailableError)) throw error;
    return parseEventRegistrants(html).map((registrant, index) =>
      toRegistration(
        index,
        registrant.player,
        ['REGISTERED', 'CHECKED_IN'].includes(registrant.status) &&
          registrant.waitlistPosition == null
          ? 'COMPLETE'
          : registrant.status,
      ),
    );
  }
}
