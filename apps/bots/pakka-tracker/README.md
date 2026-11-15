# pakka-tracker

Discord bot for tracking Riftbound (PlayRiftbound) tournament events and EloShowdown elo. Built with Discord.js v14 and TypeScript, based on the lemon-bluu bot architecture.

## What's included

- Slash command auto-discovery (root + subdirectory commands)
- Event handler loader
- Cron job handler with dev/prod guard
- Per-user command cooldowns
- Centralized command error handling in `interactionCreate`
- `@lemon-bluu/discord` logger
- Dev/prod token switching via `NODE_ENV`
- Riftbound event scraper (`src/lib/uvs/`) backed by Riot's PlayRiftbound site
- Match-history sync into Postgres (`src/lib/uvs/sync.ts`) with downtime backfill
- EloShowdown connector (`src/lib/eloshowdown/`) with a Postgres store

## Setup

```bash
cp .env.example .env
# Fill in TOKEN, CLIENT_ID, and optionally DEV_TOKEN / DEV_CLIENT_ID
# Also set DATABASE_URL (Postgres) for the elo/event store
yarn install
yarn db:migrate
yarn start:dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | Yes | Production bot token |
| `CLIENT_ID` | Yes | Production application ID |
| `DEV_TOKEN` | No | Development bot token |
| `DEV_CLIENT_ID` | No | Development application ID |
| `NODE_ENV` | No | `development` (default) or `production` |
| `DATABASE_URL` | For elo commands | Postgres connection string |

## Commands

| Command | Description |
|---|---|
| `/scrape <event_id>` | Live snapshot of a Riftbound event's tracked squad standings and cut status |
| `/scout <event_id>` | Live list of an event's enrolled players by elo |
| `/track <event_id>` | Live ingest of an event (id or URL) into the match history + elo snapshot |
| `/squad` | Show Do Some Work squad elos and their change over the last 5 Ottawa events |
| `/ottawa [limit]` | Ottawa-area players by elo, with squad members marked |
| `/storeclash standings [season] [store]` | Store Clash standings by participating store (top 4 qualify) |
| `/storeclash seasons` | List Store Clash seasons |

The squad (tracked users) is configured in `src/lib/uvs/squad.ts`. The Ottawa search area is configured in `src/lib/config/config.ts` (`ottawaCoords`, `ottawaSearchRadiusMeters`).

## Match history

A 6-hour cron (and `yarn sync`) discovers every PlayRiftbound event within the configured radius of Ottawa and ingests started events into the `rb_*` tables:

- `rb_stores` — organizers/stores
- `rb_events` — event summaries, status, raw tournament JSON, sync/elo state
- `rb_event_participants` — per-event players, final results, EloShowdown elo
- `rb_rounds`, `rb_matches`, `rb_games`, `rb_standings` — full match history

Discovery always starts at `Config.riftboundHistoryStartDate` (Oct 1 2026) with no cursor, so events missed while the bot was down are picked up automatically. `yarn sync [n]` runs the same pipeline manually and processes up to `n` events (default `riftboundSyncMaxEventsPerRun`). Events whose pages render without tournament data are marked `UNAVAILABLE`; casual Nexus Night/Pre-Rift events often have no pairings and therefore no match rows.

The old `ottawa_events` / `event_players` tables are legacy and no longer read or written.

## Store Clash

Store Clash seasons live in `store_clash_seasons` / `store_clash_stores`; `store_clash_player_stores` holds manual store-affiliation overrides. Scoring rules live in the `store_clash_standings(slug)` SQL function, shared by the bot command and the website.

- Qualifying events are completed `NEXUS_NIGHT` events at the season's participating stores.
- Points are match points (win 3, draw 1) from `rb_event_participants.points`; each player's best `best_weeks` of `weeks` scores count.
- A player represents the store where they played the most qualifying weeks (ties: total points, best week); manual overrides win. Overrides should point to a store where the player actually played, since weekly points stay tied to the store that hosted the event.
- Top 4 per store qualify.

`src/db/store-clash-radiance.sql` seeds the Radiance season (week 1 Oct 24–30, 2026; finals Jan 9, 2027). Run `yarn db:migrate` then apply that file with `psql`. Future seasons use the same two inserts with a new slug/start/weeks/stores.

## EloShowdown event tracking

The bot builds its own Ottawa community from the stored match history (the site's community tags are unreliable). The elo cron (and `yarn job`) reads completed local events from `rb_events` / `rb_event_participants`, pairs participants to EloShowdown players (new platform UUIDs, falling back to display-name matching for legacy numeric ids), and writes per-participant elo deltas back to Postgres.

`/squad` and `/ottawa` read from the stored data. Because EloShowdown's anonymous tier is rate-limited (~60 requests/hour), the job processes a bounded number of events per run (see `eloshowdownMaxRequestsPerRun`) and resumes on later runs — backfill by running `yarn job <n>` repeatedly.

## Project structure

```
src/
├── commands/
│   ├── elo/
│   │   ├── squad.ts           # /squad command
│   │   └── ottawa.ts          # /ottawa command
│   ├── misc/
│   │   └── ping.ts            # Example command
│   ├── storeclash/
│   │   └── standings.ts       # /storeclash command
│   └── uvs/
│       └── scrape.ts          # /scrape command
├── db/
│   ├── migrate.ts             # Schema migration (yarn db:migrate)
│   ├── store-clash.ts         # Store Clash tables + standings SQL function
│   └── store-clash-radiance.sql # Radiance season seed
├── events/
│   ├── ready.ts               # Logs when bot is online
│   └── interactionCreate.ts   # Routes slash commands + cooldowns
├── handlers/
│   ├── Command.ts             # Auto-loads commands, registers with Discord API
│   ├── Event.ts               # Auto-loads event files
│   └── Cron.ts                # Riftbound sync + elo jobs
├── lib/
│   ├── config/
│   │   └── config.ts          # Config object
│   ├── db.ts                  # neverthrow Postgres query wrapper
│   ├── errors.ts              # Typed app/database errors
│   ├── logger.ts              # Re-exports logger from @lemon-bluu/discord
│   ├── eloshowdown/
│   │   ├── client.ts          # EloShowdown API client (lookup, elo-history)
│   │   ├── types.ts           # EloShowdown response interfaces
│   │   ├── elo.ts             # Per-event elo computation helpers
│   │   ├── queries.ts         # DB queries for the commands
│   │   ├── format.ts          # Elo display formatting
│   │   └── service.ts         # Ottawa events job (processOttawaEvents)
│   ├── store-clash/
│   │   └── standings.ts       # Season + standings query helpers
│   └── uvs/
│       ├── types.ts           # Riftbound event interfaces
│       ├── client.ts          # PlayRiftbound search + event-page parser
│       ├── sync.ts            # Discovery + match-history ingest pipeline
│       ├── scraper.ts         # scrapePlayerData (live /scrape dashboard)
│       ├── cut-finder.ts      # Swiss cut-line Monte Carlo simulation
│       ├── squad.ts           # Tracked users + squad status evaluation
│       └── format.ts          # Status labels + squad status formatting
├── scripts/
│   ├── job.ts                 # Manual elo event job (yarn job)
│   └── sync.ts                # Manual match-history sync (yarn sync)
└── index.ts                   # Entry point
typings/
├── command.d.ts               # SlashCommand interface
├── event.d.ts                 # BotEvent interface
└── index.d.ts                 # discord.js Client module augmentation
```

## Adding a command

Create a `.ts` file anywhere under `src/commands/`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply('Hello!');
};

export const command = {
  command: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Says hello'),
  execute,
  cooldown: 5, // optional: seconds between uses per user
} satisfies SlashCommand;
```

Errors thrown from `execute` are caught and reported uniformly by the `interactionCreate` event handler.

## Scripts

| Script | Description |
|---|---|
| `yarn start:dev` | Dev mode with nodemon + pretty logs |
| `yarn start:prod` | Production with ts-node |
| `yarn build` | Compile TypeScript |
| `yarn start:built` | Run compiled output |
| `yarn db:migrate` | Create/update the Postgres schema |
| `yarn sync [n]` | Discover/ingest PlayRiftbound events (up to `n` this run) |
| `yarn job [n]` | Run the elo event job (process up to `n` events) |
| `yarn lint` | Run ESLint |
