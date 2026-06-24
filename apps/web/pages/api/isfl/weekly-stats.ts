import Query from '@/lib/db';
import { portalFetch } from '@/lib/isfl/portal';
import type { Player, PlayerStats } from '@/lib/isfl/types';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerStats[] | { error: string; detail?: string }>,
) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

	const { season, week } = req.query;
  const seasonValue = typeof season === 'string' ? Number(season) : Array.isArray(season) ? Number(season[0]) : undefined;
  const weekValue = typeof week === 'string' ? Number(week) : Array.isArray(week) ? Number(week[0]) : undefined;

  if (!seasonValue || Number.isNaN(seasonValue)) {
    return res.status(400).json({ error: 'Missing season' });
  }

	const players = await portalFetch<Player[]>('player');

  const params: Array<number> = [seasonValue];
  let query = `
    SELECT *
    FROM player_stats
    WHERE 1=1
    AND season = $1
  `;

  if (weekValue !== undefined && !Number.isNaN(weekValue)) {
    query += `AND week = $2
    `;
    params.push(weekValue);
  }

  query += `ORDER BY week ASC`;

	const result = await Query<PlayerStats>(query, params);
	if (result.isErr()) {
		console.error('[weekly-stats GET] DB error:', result.error);
		return res.status(500).json({ error: 'Database error', detail: result.error.message });
	}

	if (result.value.rows.length === 0) {
		return res.status(404).json({ error: 'Not found' });
	}

	const data = result.value.rows.map((row) => {
		const player = players.find((p) => p.pid === row.pid);
		return {
			firstName: player?.firstName ?? null,
			lastName: player?.lastName ?? null,
			username: player?.username ?? null,
			...row
		};
	});



	res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
	return res.status(200).json(data);
}
