/**
 * One-time setup helper — handles the Spotify OAuth callback and displays your
 * refresh token. Copy SPOTIFY_REFRESH_TOKEN to .env.local, then delete this
 * file and /api/spotify/login.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code.');
  }

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return res
      .status(500)
      .send('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local');
  }

  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3000/api/spotify/callback';
  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await tokenRes.json();

  if (!data.refresh_token) {
    return res.status(500).json({ error: 'No refresh token returned', data });
  }

  return res.status(200).send(`
    <html><body style="font-family:monospace;padding:2rem;max-width:600px">
      <h2>✅ Spotify connected!</h2>
      <p>Add this to your <code>.env.local</code>:</p>
      <pre style="background:#f0f0f0;padding:1rem;border-radius:4px;word-break:break-all">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>
      <p>Then restart your dev server and delete <code>pages/api/spotify/login.ts</code> and <code>pages/api/spotify/callback.ts</code>.</p>
    </body></html>
  `);
}
