import { Config } from 'src/lib/config/config';

import {
  UVSEventData,
  UVSRoundResultItem,
  UVSRoundStandingsPaginatedResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 1000;

const fetchWithTimeout = (url: string, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
};

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
