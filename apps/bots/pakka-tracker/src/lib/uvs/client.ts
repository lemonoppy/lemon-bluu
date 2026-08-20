import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';

import {
  UVSEventData,
  UVSRoundResultItem,
  UVSRoundStandingsPaginatedResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 10_000;
const EVENTS_LIST_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 1000;

// Riftbound is game id 3 on the UVS/Hydra platform (Lorcana=1, MTG=298, ...).
// Stores also run non-Riftbound events on the same API, so we must filter.
const RIFTBOUND_GAME_ID = 3;

export const isRiftboundEvent = (gameType: string | null): boolean =>
  gameType === 'RIFTBOUND';

const fetchWithTimeout = (url: string, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
};

export interface UVSEventSummary {
  id: number;
  name: string;
  game_type: string | null;
  start_datetime: string;
  end_datetime: string | null;
  heuristic_end_datetime: string | null;
  store: { id: number; name: string } | null;
}

interface UVSEventsPaginatedResponse {
  total: number;
  next: number | null;
  next_page_number: number | null;
  results: UVSEventSummary[];
}

export async function fetchEventsByStore(
  storeIds: readonly number[],
): Promise<UVSEventSummary[]> {
  const allEvents: UVSEventSummary[] = [];
  for (const storeId of storeIds) {
    try {
      for (let page = 1; page > 0; ) {
        const response = await fetchWithTimeout(
          `${Config.uvsApiBaseUrl}/events/?store=${storeId}&game=${RIFTBOUND_GAME_ID}&page=${page}&page_size=100`,
          EVENTS_LIST_TIMEOUT_MS,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch events for store ${storeId}: ${response.statusText}`,
          );
        }
        const data = (await response.json()) as UVSEventsPaginatedResponse;
        allEvents.push(
          ...(data.results ?? []).filter((event) =>
            isRiftboundEvent(event.game_type),
          ),
        );
        const next = data.next ?? data.next_page_number;
        if (next == null || next <= page) break;
        page = next;
      }
    } catch (error) {
      logger.warn(
        { error, storeId },
        `Failed to fetch events for store ${storeId}; skipping`,
      );
    }
  }
  return allEvents;
}

export async function fetchEventDetails(eventId: number): Promise<UVSEventData> {
  const response = await fetchWithTimeout(
    `${Config.uvsApiBaseUrl}/events/${eventId}/`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch event details: ${response.statusText}`);
  }
  return (await response.json()) as UVSEventData;
}

export async function fetchAllStandings(
  roundId: number,
): Promise<UVSRoundResultItem[]> {
  const allResults: UVSRoundResultItem[] = [];
  let currentUrl: string | null =
    `${Config.uvsApiBaseUrl}/tournament-rounds/${roundId}/standings/paginated/?page_size=${PAGE_SIZE}`;
  let pageNumber = 1;

  while (currentUrl) {
    const response = await fetchWithTimeout(currentUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch standings on page ${pageNumber}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as UVSRoundStandingsPaginatedResponse;
    allResults.push(...(data.results ?? []));
    currentUrl = data.next;
    pageNumber++;
  }
  return allResults;
}
