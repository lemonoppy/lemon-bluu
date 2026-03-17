import axios from 'axios';

const PORTAL_BASE = 'https://portal.sim-football.com/api/isfl/v1';

export function getSeasonUrl(): string {
  return `${PORTAL_BASE}/season`;
}

export function getStandingsUrl(season: number): string {
  return `${PORTAL_BASE}/standings?season=${season}`;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await axios.get<T>(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; isfl-draft-order/1.0)',
    },
  });
  return response.data;
}
