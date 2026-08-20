# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the bot directory (`apps/bots/pakka-tracker`) unless noted.

```bash
yarn start:dev       # Dev mode: nodemon + tsconfig-paths + pino-pretty
yarn start:prod      # Production: ts-node + tsconfig-paths
yarn build           # Compile: tsc + tsc-alias (resolves path aliases)
yarn test            # Jest
yarn lint            # ESLint
yarn db:migrate      # Create/update the Postgres schema
yarn job [n]         # Run the Ottawa events job (process up to n events)
```

To run a single test file:
```bash
yarn jest path/to/test.ts
```

## Architecture

Discord bot for tracking UVS (Riftbound) tournament events and EloShowdown elo, built on the shared lemon-bluu bot pattern:

- **Entry**: `src/index.ts` creates a Discord.js `Client`, dynamically loads all handlers from `src/handlers/` via `readdirSync`
- **Handlers**: `Command.ts` (auto-discovers `.ts` files under `src/commands/` and registers them with the Discord API), `Event.ts` (loads `src/events/`), `Cron.ts` (daily Ottawa events job, production-only)
- **Commands**: Each command exports a default object with `command` (SlashCommandBuilder) and `execute`; organized into subdirectories by domain
- **Error handling**: Centralized in `src/events/interactionCreate.ts` — commands throw, the event handler logs and replies a standardized ephemeral error. Do not wrap `execute` in per-command try/catch.
- **Intents**: Only `GatewayIntentBits.Guilds` (slash commands only; no message content)
- **Token switching**: `NODE_ENV=development` uses `DEV_TOKEN`/`DEV_CLIENT_ID`; production uses `TOKEN`/`CLIENT_ID`
- **TypeScript paths**: `src/*` alias resolved at runtime via `tsconfig-paths`; resolved post-build via `tsc-alias`
- **Logger**: Pino via `@lemon-bluu/discord` (`src/lib/logger.ts`)
- **Database**: Postgres via `pg` + `neverthrow` (`src/lib/db.ts`, `DATABASE_URL` env). The pool is created lazily on first query, so the bot boots without the DB for UVS-only commands.

## UVS scraper (`src/lib/uvs/`)

- `client.ts` — `fetchEventDetails`, `fetchAllStandings`, `fetchEventsByStore` against the UVS API (`Config.uvsApiBaseUrl`)
- `scraper.ts` — `scrapePlayerData(eventId)` core logic + `fetchEventParticipants(eventId)` (returns players with their UVS user id = EloShowdown `riftbound_id`). The top cut is derived from the event's first phase with `rank_required_to_enter_phase` (e.g. `RANKED_SINGLE_ELIMINATION`), falling back to a player-count heuristic. `displayRound` is phase-relative (round numbers are event-wide).
- `cut-finder.ts` — `simulateSwissWithDraws` Monte Carlo for the estimated cut line
- `squad.ts` — tracked users (`squadMembers` with `eloShowdownId`) + `evaluateSquadStatus` (returns structured statuses, no console output)
- `format.ts` — status labels parameterized by cut size + squad status formatting

## EloShowdown connector (`src/lib/eloshowdown/`)

The bot defines its own Ottawa community because EloShowdown's community tags are unreliable. It stores per-event results from UVS events at `Config.ottawaStoreIds` (Ottawa + Gatineau/Kanata/Carleton Place) and derives the community from players who appear in those events.

- `client.ts` — EloShowdown API client (`lookupPlayer`, `fetchPlayer`, `fetchEloHistory`). Anonymous tier is ~60 requests/hour, so it enforces a per-run budget (`Config.eloshowdownMaxRequestsPerRun`) and backs off on 429s.
- `elo.ts` — `computeEventElo(history, start, end)` matches a player's elo-history entries inside an event time window.
- `service.ts` — `processOttawaEvents({ maxEvents })`: syncs squad players, then for each finished unprocessed Ottawa event fetches standings, maps UVS user id → EloShowdown player (cached in `eloshowdown_players`), computes per-event elo deltas, and writes `ottawa_events` + `event_players`. Events are only recorded once fully processed, so rate-limited runs resume cleanly.
- `queries.ts` — DB queries backing `/squad` and `/ottawa`.

Squad members are seeded from config (`squadMembers` in `src/lib/uvs/squad.ts`) on every job run.

## Testing

Tests live alongside source (`__tests__/` subdirectories or `*.test.ts`) and use ts-jest. `src/__tests__/setup.ts` loads dotenv. Unit tests avoid importing `src/lib/db.ts` (no DATABASE_URL needed).
