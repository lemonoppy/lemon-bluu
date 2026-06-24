const PORTAL = 'https://portal-api.sim-football.com/api/isfl/v1';

export async function portalFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${PORTAL}/${path}`, {
    headers: { 'User-Agent': 'lemon-bluu/draft-analysis' },
  });

  if (!res.ok) {
    throw new Error(`Portal ${path} returned ${res.status}`);
  }

  return res.json() as Promise<T>;
}
