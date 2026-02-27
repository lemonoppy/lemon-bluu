# lemon-bluu web

Personal Next.js site with various tools and widgets.

## Features

- **Spotify now-playing** — Shows currently playing track via Spotify API
- **MTG set cube simulator** — Build and simulate MTG set cubes with Scryfall data
- **Invoice tracker** — Personal invoice management backed by Neon Postgres
- **Tessellation visualizer** — Geometric pattern playground

## Stack

- [Next.js 15](https://nextjs.org/) with Turbopack
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Neon](https://neon.tech/) (serverless Postgres)
- [Radix UI](https://www.radix-ui.com/) primitives
- [Recharts](https://recharts.org/) for data visualization

## Development

```bash
# From repo root
yarn install
yarn dev

# Or from this directory
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
# Neon database
DATABASE_URL=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

## Deployment

Deployed on [Vercel](https://vercel.com). Build command: `npx turbo run build --filter=@lemon-bluu/web`.
