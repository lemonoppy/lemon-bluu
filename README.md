# lemon-bluu

Personal monorepo — a Next.js web app, Discord bots, and CLI tools, all sharing common packages.

## Repo Structure

```
lemon-bluu/
├── apps/
│   ├── web/                    # Next.js personal site + tools
│   └── bots/
│       ├── fetcher-bee/        # Discord bot: MTG cube tools
│       ├── kaiju-keeper/       # Discord bot: ISFL stats
│       └── takoyaki/           # Discord bot: ISFL fantasy + portal tools
├── packages/
│   ├── discord/                # Shared bot utilities (format, logger)
│   ├── eslint-config/          # Shared ESLint configs
│   ├── tsconfig/               # Shared TypeScript configs
│   └── ui/                     # Shared UI utilities (cn helper)
├── tools/
│   ├── pbe-scraper/            # pbesim.com fielding stats scraper
│   ├── pbe-portal-scraper/     # pbe.simflow.io draft class scraper
│   └── mtg-glicko/             # Glicko-2 ratings for MTG cube drafts
├── package.json                # Root workspace config
└── turbo.json                  # Turborepo pipeline
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

## Tools

### `tools/pbe-scraper`
CLI scrapers for career fielding stats from pbesim.com. Includes a year-by-year 2B scraper and an all-players alphabetical scraper.

- **Stack:** TypeScript, cheerio, axios

### `tools/pbe-portal-scraper`
Puppeteer scraper for PBE draft class data from pbe.simflow.io. Requires `config.json` with login credentials (copy from `config.example.json`).

- **Stack:** TypeScript, Puppeteer

### `tools/mtg-glicko`
Glicko-2 rating calculator for MTG cube draft history. Match data lives in `src/data.ts`; run `yarn start` to recalculate.

- **Stack:** TypeScript, glicko2

## Shared Packages

| Package | Description |
|---------|-------------|
| `@lemon-bluu/discord` | Shared bot utilities: `pluralize`, `suffix`, `hexColorToInt`, `logger` |
| `@lemon-bluu/ui` | Shared UI utilities: `cn` (clsx + tailwind-merge) |
| `@lemon-bluu/eslint-config` | Shared ESLint configs for bots (`bot-flat.js`) and web (`index.js`) |
| `@lemon-bluu/tsconfig` | Shared TypeScript base configs |

## Deployment

- **Web:** Vercel (automatic deploys from `main`)
- **Bots:** Railway (coming soon)
