import Query from '@/lib/db';
import type { StoresResponse, StoreSummary } from '@/lib/riftbound';

import type { NextApiRequest, NextApiResponse } from 'next';

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  event_count: number;
  live_events: number;
  last_event_at: Date | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await Query<StoreRow>(
    `SELECT s.id, s.name,
            s.address->>'formattedAddress' AS address,
            (s.address->>'latitude')::float8 AS latitude,
            (s.address->>'longitude')::float8 AS longitude,
            s.address->>'googlePlaceId' AS google_place_id,
            count(e.id)::int AS event_count,
            count(e.id) FILTER (WHERE e.status = 'IN_PROGRESS')::int AS live_events,
            max(e.starts_at) FILTER (WHERE e.status = 'COMPLETED') AS last_event_at
     FROM rb_stores s
     JOIN rb_events e
       ON e.store_id = s.id AND e.is_local AND e.status IS NOT NULL
     GROUP BY s.id
     ORDER BY event_count DESC, s.name ASC`,
  );

  if (result.isErr()) {
    console.error('[riftbound stores] DB error:', result.error);
    return res.status(500).json({ error: 'Database error' });
  }

  const stores: StoreSummary[] = result.value.rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    googlePlaceId: row.google_place_id,
    eventCount: row.event_count,
    liveEvents: row.live_events,
    lastEventAt: row.last_event_at?.toISOString() ?? null,
  }));

  const response: StoresResponse = { stores };

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400',
  );
  return res.status(200).json(response);
}
