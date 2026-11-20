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

### PBE tools (run from repo root)

`tools/pbe/` — one package (`@lemon-bluu/pbe`) for all PBE tooling; output goes to gitignored `tools/pbe/data/<tool>/`:
```bash
yarn pbe:scrape-all       # Fielding: full all-players scrape (alphabetical)
yarn pbe:update-all       # Fielding: re-scrape recently active players only
yarn pbe:snapshot [season] # Fielding: current-season snapshot (TSV only)
yarn pbe:portal 64        # Portal: scrape every player drafted in S64
yarn pbe:forum "https://forum.pbesim.com/showthread.php?tid=44287"
yarn pbe:forum "<thread-url>" --ai  # Add Gemini AI-authorship review flags
yarn pbe:test             # Forum parser tests
yarn workspace @lemon-bluu/pbe build
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
  pbe/                 # PBE CLI tools: fielding stats, portal draft classes, forum checker
  mtg-glicko/          # Glicko-2 rating calculator for MTG cube draft results
```

### `apps/web` — Next.js Personal Site

- **Pages Router** (not App Router) — pages live in `pages/`
- **Database**: Neon serverless Postgres via `@neondatabase/serverless`; `lib/db.ts` wraps queries with `neverthrow` `ResultAsync` for typed error handling
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming (`--foreground`, `--accent-color`, `--border`, etc.)
- **UI components**: Radix UI primitives + `shadcn/ui` pattern (`components/ui/`); shared `cn` helper from `@lemon-bluu/ui`
- **Key feature areas**: MTG set cube builder/simulator (`lib/set-cube/`, `pages/set/`), image pixelation (`pages/pixel/`), Spotify now-playing widget, Ottawa Riftbound explorer and Store Clash standings (`pages/riftbound/`, `pages/api/riftbound/`, `lib/riftbound.ts`)

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

**`tools/pbe/`** (`@lemon-bluu/pbe`) — single package with one folder per tool under `src/`:
- `src/shared/paths.ts` — `PACKAGE_ROOT` and `dataDirectory(tool)`, which returns (and creates) `data/<tool>/`
- `src/shared/browser.ts` — `launchBrowser(profileName)`: headed installed Chrome with a persistent profile at `.chrome-profile/<profileName>/` so Cloudflare clearance and logins survive between runs (`PBE_CHROME_EXECUTABLE` overrides the binary)
- `src/fielding/` — pbesim.com fielding stats, no credentials needed
  - `types.ts` — `PlayerLink`, `FieldingStatRow`, `PlayerData` interfaces
  - `utils.ts` — `fetchPage`, `delay`, `extractCareerFieldingStats(html, name)`, `saveToJson`, `saveToTsv`
  - `scraper.ts` — iterates alphabetical player pages (a–z), captures all positions, tracks `lastActiveSeason`, saves `data/fielding/all_players_fielding.{json,tsv}`; `--update` re-scrapes recently active players only
  - `snapshot.ts` — walks the current league player list, keeps target-season fielding rows for all positions, saves `data/fielding/current_season_fielding_{season}.tsv` without touching the complete store
- `src/portal/` — Simflow draft classes
  - `browser.ts` — opens a logged-in portal session (`.chrome-profile/portal/`) and runs `fetch` inside the page
  - `scraper.ts` — accepts a season argument, pages through the player list AJAX endpoint with the `class` filter, maps pid/username/name/position/archetype/tpe/bankAccount/team, and saves `data/portal/drafted-players-s{season}.{json,tsv}`
- `src/forum/` — forum reply qualification checker (`.chrome-profile/forum/`)
  - Excludes the opening post and quoted content, then qualifies replies over 150 words or containing a link
  - Saves a unique username list and JSON audit report to `data/forum/`; `--ai` adds non-binding Gemini authorship flags

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

### Commit Convention

All commits use **Conventional Commits** format: `type(scope): description`

Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`

Examples:
- `feat(kaiju-keeper): add defensive milestone tracking`
- `fix(takoyaki): defer reply in /ask to avoid Discord timeout`
- `chore: add yarn dev alias`

GitHub renders the type as a badge on the commit history automatically.

### Prettier Config

Single quotes, semicolons, trailing commas, 2-space indent, 80-char print width (`.prettierrc` at root).
