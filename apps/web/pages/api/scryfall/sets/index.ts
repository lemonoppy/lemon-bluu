import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const upstream = await fetch('https://api.scryfall.com/sets', {
    headers: { 'User-Agent': 'lemonoppy/1.0' },
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
