import { processDSFLWeeklyStats } from '@/lib/isfl/process-week-dsfl';
import type { DSFLWeeklyStatsRow } from '@/lib/isfl/process-week-dsfl';

import type { NextApiRequest, NextApiResponse } from 'next';

type DSFLWeeklyStatsResponse = DSFLWeeklyStatsRow[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DSFLWeeklyStatsResponse | { error: string; detail?: string }>,
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const { season, week } = req.query;

  const seasonValue =
    typeof season === 'string'
      ? Number(season)
      : Array.isArray(season)
        ? Number(season[0])
        : undefined;

  const weekValue =
    typeof week === 'string'
      ? Number(week)
      : Array.isArray(week)
        ? Number(week[0])
        : undefined;

  if (!seasonValue || Number.isNaN(seasonValue)) {
    return res.status(400).json({ error: 'Missing season' });
  }

  if (!weekValue || Number.isNaN(weekValue)) {
    return res.status(400).json({ error: 'Missing week' });
  }

  try {
    const data = await processDSFLWeeklyStats(seasonValue, weekValue);

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );

    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return res.status(500).json({
      error: 'Failed to process DSFL weekly stats',
      detail: message,
    });
  }
}
