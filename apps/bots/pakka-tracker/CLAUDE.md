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
```

To run a single test file:
```bash
yarn jest path/to/test.ts
```

## Architecture

Discord bot for tracking UVS (Riftbound) tournament events, built on the shared lemon-bluu bot pattern:

- **Entry**: `src/index.ts` creates a Discord.js `Client`, dynamically loads all handlers from `src/handlers/` via `readdirSync`
- **Handlers**: `Command.ts` (auto-discovers `.ts` files under `src/commands/` and registers them with the Discord API), `Event.ts` (loads `src/events/`), `Cron.ts` (placeholder for scheduled jobs)
- **Commands**: Each command exports a default object with `command` (SlashCommandBuilder) and `execute`; organized into subdirectories by domain
- **Error handling**: Centralized in `src/events/interactionCreate.ts` — commands throw, the event handler logs and replies a standardized ephemeral error. Do not wrap `execute` in per-command try/catch.
- **Intents**: Only `GatewayIntentBits.Guilds` (slash commands only; no message content)
- **Token switching**: `NODE_ENV=development` uses `DEV_TOKEN`/`DEV_CLIENT_ID`; production uses `TOKEN`/`CLIENT_ID`
- **TypeScript paths**: `src/*` alias resolved at runtime via `tsconfig-paths`; resolved post-build via `tsc-alias`
- **Logger**: Pino via `@lemon-bluu/discord` (`src/lib/logger.ts`)

## UVS scraper (`src/lib/uvs/`)

- `client.ts` — `fetchEventDetails`, `fetchAllStandings` against the UVS API (`Config.uvsApiBaseUrl`)
- `scraper.ts` — `scrapePlayerData(eventId)` core logic. The top cut is derived from the event's first phase with `rank_required_to_enter_phase` (e.g. `RANKED_SINGLE_ELIMINATION`), falling back to a player-count heuristic. `displayRound` is phase-relative (round numbers are event-wide).
- `cut-finder.ts` — `simulateSwissWithDraws` Monte Carlo for the estimated cut line
- `squad.ts` — tracked users (`squadMembers`) + `evaluateSquadStatus` (returns structured statuses, no console output)
- `format.ts` — status labels parameterized by cut size + squad status formatting

## Testing

Tests live alongside source (`__tests__/` subdirectories or `*.test.ts`) and use ts-jest. `src/__tests__/setup.ts` loads dotenv.
