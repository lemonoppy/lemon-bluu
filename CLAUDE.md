# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands use **Yarn** (v1 classic). Run from the repo root unless noted.

### Root-level (Turborepo)
```bash
yarn install          # Install all workspace dependencies
yarn dev              # Start all apps in dev mode concurrently
yarn build            # Build the web app only (--filter=@lemon-bluu/web)
yarn lint             # Lint all workspaces
yarn format           # Format all workspaces with Prettier
```

### Web app (`apps/web`)
```bash
cd apps/web
yarn dev              # Next.js dev server with Turbopack
yarn build            # Production build
yarn lint             # ESLint
```

### Discord bots (run from bot directory)
```bash
yarn start:dev        # Dev mode: nodemon + tsconfig-paths + pino-pretty
yarn start:prod       # Production: ts-node + tsconfig-paths
yarn build            # Compile: tsc + tsc-alias (resolves path aliases)
yarn test             # Jest
yarn test:coverage    # Jest with coverage report
```

To run a single test file:
```bash
yarn jest path/to/test.ts
```

### PBE scrapers (run from tool directory)

`tools/pbe-scraper/` — pbesim.com fielding stats (no credentials needed):
```bash
yarn start            # Full 2B scrape across all years
yarn new-season       # Add one new season to the 2B dataset
yarn scrape-all       # Full all-players scrape (alphabetical)
yarn update-all       # Re-scrape recently active players only
yarn test             # Test 2B scraper on 2 years
yarn test-all         # Test all-players scraper on letter B
yarn test-new-season  # Dry run: preview what yarn new-season would do
yarn build            # Compile TypeScript
```

`tools/pbe-portal-scraper/` — pbe.simflow.io draft classes (requires `config.json`):
```bash
cp config.example.json config.json  # First-time setup: add credentials
yarn scrape           # Scrape current draft class (edit SEASON in src/scraper.ts)
yarn build            # Compile TypeScript
# Debug scripts (open visible browser window):
yarn debug-page       # Inspect draftee list page (no login)
yarn debug-player     # Inspect single player page
yarn debug-all-xp     # Log XP distribution across all players
yarn debug-filter     # Inspect bootstrap-table filter behavior
yarn debug-table      # Inspect label/input structure on player page
yarn debug-xp-filter  # Inspect table headers and inputs
```

`tools/mtg-glicko/` — Glicko-2 ratings for MTG cube drafts:
```bash
yarn start            # Run calculator, write output/mtg_glicko_data.json
yarn build            # Compile TypeScript
```

Pre-commit hooks run `yarn lint-staged`, which auto-runs `eslint --fix` on staged TypeScript files per workspace.

## Architecture

### Monorepo Layout

Turborepo manages the build pipeline. Workspaces are `apps/*`, `apps/bots/*`, `packages/*`, and `tools/*`.

```
apps/web/              # Next.js personal site (Pages Router, Vercel deploy)
apps/bots/
  fetcher-bee/         # Discord bot: MTG cube draft tools
  kaiju-keeper/        # Discord bot: ISFL football stats (PostgreSQL, Google Sheets)
  takoyaki/            # Discord bot: ISFL fantasy + portal (SQLite, Google Sheets)
  bot-template/        # Starter template for new bots
packages/
  discord/             # Shared bot utilities: pluralize, suffix, hexColorToInt, logger
  ui/                  # Shared web utilities: cn (clsx + tailwind-merge)
  eslint-config/       # Shared ESLint configs (bot-flat.js for bots, index.js for web)
  tsconfig/            # Shared tsconfig bases (base.json, node.json, nextjs.json)
tools/
  pbe-scraper/         # CLI scrapers for pbesim.com fielding stats (TypeScript, cheerio/axios)
  pbe-portal-scraper/  # CLI scraper for pbe.simflow.io draft classes (TypeScript, Puppeteer, requires config.json)
  mtg-glicko/          # Glicko-2 rating calculator for MTG cube draft results
```

### `apps/web` — Next.js Personal Site

- **Pages Router** (not App Router) — pages live in `pages/`
- **Database**: Neon serverless Postgres via `@neondatabase/serverless`; `lib/db.ts` wraps queries with `neverthrow` `ResultAsync` for typed error handling
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming (`--foreground`, `--accent-color`, `--border`, etc.)
- **UI components**: Radix UI primitives + `shadcn/ui` pattern (`components/ui/`); shared `cn` helper from `@lemon-bluu/ui`
- **Key feature areas**: MTG set cube builder/simulator (`lib/set-cube/`, `pages/set/`), image pixelation (`pages/pixel/`), Spotify now-playing widget

### Discord Bots — Shared Pattern

All three bots share the same architecture (also documented in per-bot CLAUDE.md files):

- **Entry**: `src/index.ts` creates a Discord.js `Client`, dynamically loads all handlers from `src/handlers/` via `readdirSync`
- **Handlers**: `Command.ts` (auto-discovers all `.ts` files under `src/commands/`), `Event.ts` (loads `src/events/`), `Cron.ts` (scheduled jobs)
- **Commands**: Each command exports a default object with `command` (SlashCommandBuilder) and `execute` function; organized into subdirectories by domain
- **Token switching**: `NODE_ENV=development` uses `DEV_TOKEN`/`DEV_CLIENT_ID`; production uses `TOKEN`/`CLIENT_ID`
- **TypeScript paths**: `src/*` alias resolved at runtime via `tsconfig-paths`; resolved post-build via `tsc-alias`
- **Logger**: Pino; pretty-printed in development (`pino-pretty`)

### Tools

All tools extend `@lemon-bluu/eslint-config/bot-flat.js` with `no-console: 'off'` (CLI tools need console output). None use `tsconfig-paths`; no path aliases.

**`tools/pbe-scraper/`** (`@lemon-bluu/pbe-scraper`):
- `src/types.ts` — `PlayerLink`, `FieldingStatRow`, `PlayerData` interfaces
- `src/utils.ts` — shared `fetchPage`, `delay`, `extractCareerFieldingStats(html, name, filterPosition?)`, `saveToJson`, `saveToTsv`
- `src/scraper.ts` — iterates fielding pages by year (newest→oldest), extracts 2B players, saves `second_basemen_stats.{json,tsv}`
- `src/scraper-all.ts` — iterates alphabetical player pages (a–z), captures all positions, tracks `lastActiveSeason`, saves `all_players_fielding.{json,tsv}`
- `src/scrape-new-season.ts` — adds a single new season to the 2B dataset

**`tools/pbe-portal-scraper/`** (`@lemon-bluu/pbe-portal-scraper`):
- Uses **Puppeteer** (browser automation); site requires login
- Credentials in `config.json` (gitignored) — copy from `config.example.json`
- `src/scraper.ts` — logs in, filters MiLPBE player list to XP=1 (rookies), scrapes pid/username/name/position/archetype/tpe/bankAccount/team, saves `drafted-players-s{SEASON}.json`
- `src/debug/` — 6 one-off debug scripts for inspecting page structure

**`tools/mtg-glicko/`** (`@lemon-bluu/mtg-glicko`):
- `src/data.ts` — `MatchRecord[]` with all historical cube draft results
- `src/calculator.ts` — runs Glicko-2 per draft, writes `output/mtg_glicko_data.json`
- To add new results: append to `games` in `src/data.ts` and bump `TO_DRAFT`

### Shared Packages

- **`@lemon-bluu/discord`**: `pluralize`, `suffix`, `hexColorToInt`, and a Pino-based `logger` — imported by all bots
- **`@lemon-bluu/ui`**: `cn` utility (clsx + tailwind-merge) — imported by `apps/web`
- **`@lemon-bluu/eslint-config`**: `bot-flat.js` for bots (flat config), `index.js` for web

### Error Handling Convention

Both `apps/web` and `kaiju-keeper` use `neverthrow` (`Result`/`ResultAsync`) for typed error propagation instead of try/catch. New code in these apps should follow the same pattern.

### Prettier Config

Single quotes, semicolons, trailing commas, 2-space indent, 80-char print width (`.prettierrc` at root).
