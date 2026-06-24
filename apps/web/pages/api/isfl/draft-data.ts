import { portalFetch } from '@/lib/isfl/portal';
import type { DraftPick, GMData } from '@/lib/isfl/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Permanent cache: past season picks never change once the draft is done
const picksCache = new Map<number, DraftPick[]>();

// Volatile caches: refreshed weekly
let tpeCache: { map: Map<number, number>; fetchedAt: number } | null = null;
let gmCache: { data: GMData[]; fetchedAt: number } | null = null;

type RawPick = {
  season: number;
  round: number;
  overall: number;
  pid: number;
  type: string | null;
  originalTeam: string;
  owningTeam: string;
  firstName: string;
  lastName: string;
  uid: number;
  username: string;
};

type RawPlayer = {
  pid: number;
  highestTPE: number;
};

type RawGMHistory = {
  uid: number;
  username: string;
  season: number;
  team: string;
  league: string;
};

type RawSeason = {
  season: number;
};

export type DraftDataResponse = {
  picks: DraftPick[];
  gmData: GMData[];
  maxRound: number;
  currentSeason: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DraftDataResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // 1. Get current season
  let currentSeason: number;
  try {
    const season = await portalFetch<RawSeason>('season');
    currentSeason = season.season;
  } catch {
    res.status(503).json({ error: 'portal_unavailable' });
    return;
  }

  // 2. Fetch missing seasons in parallel
  const missingSeason = Array.from({ length: currentSeason }, (_, i) => i + 1).filter(
    (s) => !picksCache.has(s),
  );

  if (missingSeason.length > 0) {
    const results = await Promise.allSettled(
      missingSeason.map((s) => portalFetch<RawPick[]>(`draft-picks?season=${s}`)),
    );
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const season = missingSeason[i];
        // Store without TPE for now; we'll patch below
        picksCache.set(
          season,
          result.value.map((p) => ({
            season: p.season,
            round: p.round,
            pick: p.overall,
            pid: p.pid,
            type: p.type ?? 'regular',
            originalTeam: p.originalTeam,
            owningTeam: p.owningTeam,
            username: p.username,
            name: `${p.firstName} ${p.lastName}`,
            highestTPE: 0,
          })),
        );
      }
      // Failed seasons are not stored — next request will retry them
    });
  }

  // 3. Refresh player TPE cache if stale
  const now = Date.now();
  if (!tpeCache || now - tpeCache.fetchedAt > WEEK_MS) {
    try {
      const players = await portalFetch<RawPlayer[]>('player');
      const map = new Map<number, number>();
      for (const p of players) {
        map.set(p.pid, p.highestTPE);
      }
      tpeCache = { map, fetchedAt: now };
    } catch {
      // Use stale cache if available; proceed with TPE=0 if not
    }
  }

  // 4. Refresh GM history cache if stale
  if (!gmCache || now - gmCache.fetchedAt > WEEK_MS) {
    try {
      const history = await portalFetch<RawGMHistory[]>('gm-history?league=ISFL');
      gmCache = {
        data: history.map((g) => ({ uid: g.uid, username: g.username, season: g.season, team: g.team })),
        fetchedAt: now,
      };
    } catch (err) {
      console.error('[draft-data] Failed to fetch gm-history:', err);
      if (!gmCache) gmCache = { data: [], fetchedAt: now };
    }
  }

  // 5. Merge TPE into picks, filter zero-TPE, flatten
  const tpeMap = tpeCache?.map ?? new Map<number, number>();
  const allPicks: DraftPick[] = [];

  for (const seasonPicks of picksCache.values()) {
    for (const pick of seasonPicks) {
      const highestTPE = tpeMap.get(pick.pid) ?? 0;
      if (highestTPE === 0) continue;
      allPicks.push({ ...pick, highestTPE });
    }
  }

  const maxRound = allPicks.reduce((m, p) => Math.max(m, p.round), 1);

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({
    picks: allPicks,
    gmData: gmCache?.data ?? [],
    maxRound,
    currentSeason,
  });
}
