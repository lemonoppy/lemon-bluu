import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { setCode, page = '1' } = req.query;
  if (!setCode || typeof setCode !== 'string') {
    return res.status(400).json({ error: 'Missing setCode' });
  }

  const upstream = await fetch(
    `https://api.scryfall.com/cards/search?q=set:${setCode}+not:reprint+game:paper&unique=cards&order=set&page=${page}`,
    { headers: { 'User-Agent': 'lemonoppy/1.0' } },
  );

  if (upstream.status === 404) {
    return res.status(200).json({ data: [], has_more: false });
  }

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
