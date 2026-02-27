# lemon-bluu

Personal monorepo — a Next.js web app and Discord bots, all sharing common packages.

## Repo Structure

```
lemon-bluu/
├── apps/
│   ├── web/                  # Next.js personal site + tools
│   └── bots/
│       ├── fetcher-bee/      # Discord bot: MTG cube tools
│       ├── kaiju-keeper/     # Discord bot: ISFL stats
│       └── takoyaki/         # Discord bot: ISFL fantasy + portal tools
├── packages/
│   ├── discord/              # Shared bot utilities (format, logger)
│   ├── eslint-config/        # Shared ESLint configs
│   ├── tsconfig/             # Shared TypeScript configs
│   └── ui/                   # Shared UI utilities (cn helper)
├── package.json              # Root workspace config
└── turbo.json                # Turborepo pipeline
```

## Quick Start

```bash
yarn install
yarn dev
```

> Bots require `.env` files — copy `.env.example` in each bot directory and fill in your tokens.

## Apps

### `apps/web` — Personal Site
Next.js 15 app with Tailwind CSS. Includes a Spotify now-playing widget, MTG set cube simulator, and more.

- **Stack:** Next.js, TypeScript, Tailwind CSS, Neon (Postgres)
- **Deploy:** Vercel

### `apps/bots/fetcher-bee` — Fetcher Bee
Discord bot for MTG cube draft tooling. Supports cube history lookups, P1P1/P1P2 draft recommendations, and more.

- **Stack:** Discord.js v14, TypeScript, ts-node

### `apps/bots/kaiju-keeper` — Kaiju Keeper
Discord bot for ISFL (football sim league) statistics. Tracks player/team stats, milestones, leaderboards, and roster info. Scrapes data from the league index and saves to db.

- **Stack:** Discord.js v14, TypeScript, PostgreSQL, Google Sheets API

### `apps/bots/takoyaki` — Takoyaki
Discord bot for the ISFL sim league. Handles fantasy football, portal queries, standings, schedules, and channel tracking.

- **Stack:** Discord.js v14, TypeScript, SQLite, Google Sheets API

## Shared Packages

| Package | Description |
|---------|-------------|
| `@lemon-bluu/discord` | Shared bot utilities: `pluralize`, `suffix`, `hexColorToInt`, `logger` |
| `@lemon-bluu/ui` | Shared UI utilities: `cn` (clsx + tailwind-merge) |
| `@lemon-bluu/eslint-config` | Shared ESLint configs for bots (`/bot`) and web (`index.js`) |
| `@lemon-bluu/tsconfig` | Shared TypeScript base configs |

## Deployment

- **Web:** Vercel (automatic deploys from `main`)
- **Bots:** Railway (coming soon)
