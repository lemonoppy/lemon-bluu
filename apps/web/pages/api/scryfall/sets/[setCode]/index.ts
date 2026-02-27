import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { setCode } = req.query;
  if (!setCode || typeof setCode !== 'string') {
    return res.status(400).json({ error: 'Missing setCode' });
  }

  const upstream = await fetch(`https://api.scryfall.com/sets/${setCode}`, {
    headers: { 'User-Agent': 'lemonoppy/1.0' },
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
