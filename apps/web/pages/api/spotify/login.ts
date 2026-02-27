/**
 * One-time setup helper — visit /api/spotify/login to kick off the OAuth flow.
 * Spotify requires a loopback IP (not "localhost") for local HTTP redirects.
 * Register http://127.0.0.1:3000/api/spotify/callback in your Spotify app dashboard.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { SPOTIFY_CLIENT_ID } = process.env;

  if (!SPOTIFY_CLIENT_ID) {
    return res.status(500).json({ error: 'SPOTIFY_CLIENT_ID not set in .env.local' });
  }

  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3000/api/spotify/callback';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: 'user-read-currently-playing user-read-recently-played',
    redirect_uri: redirectUri,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
