import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { exact } = req.query;
  if (!exact || typeof exact !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter exact' });
  }

  const upstream = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(exact)}`,
    { headers: { 'User-Agent': 'lemonoppy/1.0' } }
  );

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
