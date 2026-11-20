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
yarn sync [n]        # Discover/ingest PlayRiftbound events (up to n this run)
yarn job [n]         # Run the Ottawa events elo job (process up to n events)
```

To run a single test file:
```bash
yarn jest path/to/test.ts
```

## Architecture

Discord bot for tracking Riftbound (PlayRiftbound) tournament events and EloShowdown elo, built on the shared lemon-bluu bot pattern:

- **Entry**: `src/index.ts` creates a Discord.js `Client`, dynamically loads all handlers from `src/handlers/` via `readdirSync`
- **Handlers**: `Command.ts` (auto-discovers `.ts` files under `src/commands/` and registers them with the Discord API), `Event.ts` (loads `src/events/`), `Cron.ts` (hourly Riftbound sync + hourly elo event backfill + 6-hourly stale elo refresh, production-only)
- **Commands**: Each command exports a default object with `command` (SlashCommandBuilder) and `execute`; organized into subdirectories by domain
- **Error handling**: Centralized in `src/events/interactionCreate.ts` — commands throw, the event handler logs and replies a standardized ephemeral error. Do not wrap `execute` in per-command try/catch.
- **Intents**: Only `GatewayIntentBits.Guilds` (slash commands only; no message content)
- **Token switching**: `NODE_ENV=development` uses `DEV_TOKEN`/`DEV_CLIENT_ID`; production uses `TOKEN`/`CLIENT_ID`
- **TypeScript paths**: `src/*` alias resolved at runtime via `tsconfig-paths`; resolved post-build via `tsc-alias`
- **Logger**: Pino via `@lemon-bluu/discord` (`src/lib/logger.ts`)
- **Database**: Postgres via `pg` + `neverthrow` (`src/lib/db.ts`, `DATABASE_URL` env). The pool is created lazily on first query, so live-only `/scrape` and `/scout` still work without the DB.

## Riftbound scraper (`src/lib/uvs/`)

The bot reads Riot's PlayRiftbound site (`playriftbound.com`), which replaced the old UVS store platform. Match history is stored in the `rb_*` tables; the legacy `ottawa_events` / `event_players` tables are no longer read or written.

- `client.ts` — two data sources. `fetchEventSummariesSince(startDate)` calls the site's persisted-query GraphQL search (`Config.riftboundGqlUrl`, hash in `Config.riftboundSearchHash`) for events within `Config.ottawaSearchRadiusMeters` of Ottawa. `fetchParsedEvent` fetches the server-rendered event page and parses the tournament JSON out of the Next.js RSC flight payload. Some events render a reduced page with no tournament data; those throw `TournamentUnavailableError` and are marked `UNAVAILABLE`. Event ids are strings (they exceed JS safe-integer range and accept a full playriftbound.com URL via `extractEventId`).
- `sync.ts` — the history pipeline. `syncRiftboundEvents()` discovers from `Config.riftboundHistoryStartDate` on every run (so downtime auto-backfills), upserts `rb_stores`/`rb_events`, then ingests started events (newest structured events first) into `rb_event_participants`, `rb_rounds`, `rb_matches`, `rb_games`, `rb_standings`, storing the raw tournament JSON. Recheck policy: in-progress → next run, first completed fetch → +24h correction pass, then final. `rb_sync_state` holds the overlap lock and run stats. `ingestEventById` is the live path used by `/track`.
- `scraper.ts` — `scrapePlayerData(eventId)` live dashboard logic for `/scrape` + `timerStatusLabel`. Standings come from each round's `endOfRoundStandings`. The top cut is `config.finalBracketStage.participantCount`; the bracket stage is synthesized until the site creates it, and ungenerated Swiss rounds are filled from `config.roundCount` so cut math has the full schedule. `displayRound` is phase-relative (round numbers are event-wide).
- `cut-finder.ts` — `simulateSwissWithDraws` Monte Carlo for the estimated cut line
- `squad.ts` — tracked users (`squadMembers` with `eloShowdownId`) + `evaluateSquadStatus` (returns structured statuses, no console output)
- `format.ts` — status labels parameterized by cut size + squad status formatting

## EloShowdown connector (`src/lib/eloshowdown/`)

The bot defines its own Ottawa community because EloShowdown's community tags are unreliable. It reads the stored `rb_*` history for events within the Ottawa radius (Ottawa + Gatineau/Kanata/Carleton Place) and derives the community from players who appear in those events.

- `client.ts` — EloShowdown API client (`lookupPlayer`, `fetchPlayer`, `fetchEloHistory`). Anonymous tier is ~60 requests/hour, so it enforces a per-run budget (`Config.eloshowdownMaxRequestsPerRun`) and backs off on 429s.
- `elo.ts` — `computeEventElo(history, start, end)` matches a player's elo-history entries inside an event time window.
- `service.ts` — `processOttawaEvents({ maxEvents })`: syncs squad players, then for each completed local event with stored participants reads `rb_event_participants`, maps the PlayRiftbound player UUID → EloShowdown player (cached in `eloshowdown_players`, falling back to exact display-name matching for players still keyed by legacy numeric ids), computes per-event elo deltas, and writes them back to the participant row. `processOttawaEventById` (used by `/track`) ingests a live snapshot first. Rate-limited events stay `elo_complete = false` and are retried.
- `queries.ts` — DB queries backing `/squad` and `/ottawa` against `rb_event_participants` / `rb_events`.

Squad members are seeded from config (`squadMembers` in `src/lib/uvs/squad.ts`) on every job run.

## Store Clash (`src/lib/store-clash/`, `src/commands/storeclash/`)

Seasons are managed with direct SQL (`store_clash_seasons`, `store_clash_stores`, `store_clash_player_stores`; seed example in `src/db/store-clash-radiance.sql`). The scoring rules live in the `store_clash_standings(slug)` SQL function in `src/db/store-clash.ts`, so the bot and the website share one implementation. The `/storeclash` command exposes `standings` (all stores or one store) and `seasons`; store autocomplete is wired through `src/events/interactionCreate.ts`.

## Testing

Tests live alongside source (`__tests__/` subdirectories or `*.test.ts`) and use ts-jest. `src/__tests__/setup.ts` loads dotenv. Unit tests avoid importing `src/lib/db.ts` (no DATABASE_URL needed).
