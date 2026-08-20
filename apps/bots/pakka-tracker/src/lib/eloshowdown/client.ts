import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';

import { EloHistoryResponse, EloShowdownPlayer, EloShowdownSeason } from './types';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class EloShowdownApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

// Thrown when the per-run request budget is exhausted so the job can stop
// gracefully and resume on a later run.
export class BudgetExceededError extends Error {}

let requestCount = 0;

export const getRequestCount = () => requestCount;
export const resetRequestCount = () => {
  requestCount = 0;
};

export const ensureWithinBudget = () => {
  if (requestCount >= Config.eloshowdownMaxRequestsPerRun) {
    throw new BudgetExceededError(
      `EloShowdown request budget (${Config.eloshowdownMaxRequestsPerRun}) exhausted`,
    );
  }
};

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (response.status !== 429 || attempt >= retries) {
      return response;
    }
    logger.warn(
      `EloShowdown rate limited, backing off (attempt ${attempt + 1}/${retries})`,
    );
    await sleep(1000 * (attempt + 1));
  }
}

async function getJson<T>(path: string): Promise<T> {
  ensureWithinBudget();
  requestCount++;
  await sleep(Config.eloshowdownRequestDelayMs);
  const response = await fetchWithRetry(`${Config.eloshowdownApiBaseUrl}${path}`);
  if (!response.ok) {
    throw new EloShowdownApiError(
      `EloShowdown request failed (${response.status}): ${path}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function lookupPlayer(riftboundId: string | number): Promise<EloShowdownPlayer> {
  return getJson(`/lookup?riftbound_id=${encodeURIComponent(String(riftboundId))}`);
}

export function fetchPlayer(playerId: number): Promise<EloShowdownPlayer> {
  return getJson(`/players/${playerId}`);
}

export function fetchEloHistory(playerId: number): Promise<EloHistoryResponse> {
  return getJson(`/players/${playerId}/elo-history?season=all`);
}

export function fetchCurrentSeason(): Promise<EloShowdownSeason> {
  return getJson('/seasons/current');
}
