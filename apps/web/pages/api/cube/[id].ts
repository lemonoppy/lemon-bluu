import Query from '@/lib/db';

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string')
    return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'GET') {
    const result = await Query<{ data: unknown; updated_at: string }>(
      'SELECT data, updated_at FROM set_cube_snapshots WHERE id = $1',
      [id],
    );
    if (result.isErr()) {
      console.error('[cube GET] DB error:', result.error);
      return res.status(500).json({ error: 'Database error', detail: result.error.message });
    }
    if (result.value.rows.length === 0)
      return res.status(404).json({ error: 'Not found' });
    const row = result.value.rows[0];
    return res.status(200).json({ data: row.data, updatedAt: row.updated_at });
  }

  if (req.method === 'PUT') {
    const writeToken = req.headers['x-write-token'];
    if (!writeToken || typeof writeToken !== 'string') {
      return res.status(401).json({ error: 'Missing write token' });
    }

    const body = req.body;
    if (!body) return res.status(400).json({ error: 'Missing body' });

    const existing = await Query<{ write_token: string }>(
      'SELECT write_token FROM set_cube_snapshots WHERE id = $1',
      [id],
    );
    if (existing.isErr()) {
      console.error('[cube PUT] DB error on SELECT:', existing.error);
      return res.status(500).json({ error: 'Database error', detail: existing.error.message });
    }

    if (existing.value.rows.length === 0) {
      const insert = await Query(
        'INSERT INTO set_cube_snapshots (id, write_token, data) VALUES ($1, $2, $3)',
        [id, writeToken, JSON.stringify(body)],
      );
      if (insert.isErr()) {
        console.error('[cube PUT] INSERT error:', insert.error);
        return res.status(500).json({ error: 'Failed to create', detail: insert.error.message });
      }
    } else {
      if (existing.value.rows[0].write_token !== writeToken) {
        return res.status(403).json({ error: 'Invalid write token' });
      }
      const update = await Query(
        'UPDATE set_cube_snapshots SET data = $1, updated_at = now() WHERE id = $2',
        [JSON.stringify(body), id],
      );
      if (update.isErr()) {
        console.error('[cube PUT] UPDATE error:', update.error);
        return res.status(500).json({ error: 'Failed to update', detail: update.error.message });
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
