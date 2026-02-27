import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const upstream = await fetch(
    `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`,
    { headers: { 'User-Agent': 'lemonoppy/1.0' } }
  );

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
