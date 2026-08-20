# pakka-tracker

Discord bot for tracking UVS (Riftbound) tournament events and EloShowdown elo. Built with Discord.js v14 and TypeScript, based on the lemon-bluu bot architecture.

## What's included

- Slash command auto-discovery (root + subdirectory commands)
- Event handler loader
- Cron job handler with dev/prod guard
- Per-user command cooldowns
- Centralized command error handling in `interactionCreate`
- `@lemon-bluu/discord` logger
- Dev/prod token switching via `NODE_ENV`
- UVS event scraper (`src/lib/uvs/`) backed by the official UVS API
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
| `/scrape <event_id>` | Scrape a UVS event and show the tracked squad's standings and cut status |
| `/squad` | Show Do Some Work squad elos and their change over the last 5 Ottawa events |
| `/ottawa [limit]` | Ottawa-area players by elo (bold = squad), with # Ottawa events and last played |

The squad (tracked users) is configured in `src/lib/uvs/squad.ts`. Ottawa-area stores are configured in `src/lib/config/config.ts` (`ottawaStoreIds`).

## EloShowdown event tracking

The bot builds its own Ottawa community by storing results from UVS events at Ottawa-area stores (the site's community tags are unreliable). A daily cron job (and `yarn job`) queries the UVS events API for those stores, pairs participants to EloShowdown players by their Riftbound user id, and records per-event elo deltas in Postgres.

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
│   └── uvs/
│       └── scrape.ts          # /scrape command
├── db/
│   └── migrate.ts             # Schema migration (yarn db:migrate)
├── events/
│   ├── ready.ts               # Logs when bot is online
│   └── interactionCreate.ts   # Routes slash commands + cooldowns
├── handlers/
│   ├── Command.ts             # Auto-loads commands, registers with Discord API
│   ├── Event.ts               # Auto-loads event files
│   └── Cron.ts                # Daily Ottawa events job
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
│   └── uvs/
│       ├── types.ts           # UVS API response interfaces
│       ├── client.ts          # API client (fetch with timeout)
│       ├── scraper.ts         # scrapePlayerData + fetchEventParticipants
│       ├── cut-finder.ts      # Swiss cut-line Monte Carlo simulation
│       ├── squad.ts           # Tracked users + squad status evaluation
│       └── format.ts          # Status labels + squad status formatting
├── scripts/
│   └── job.ts                 # Manual Ottawa events job (yarn job)
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
| `yarn job [n]` | Run the Ottawa events job (process up to `n` events) |
| `yarn lint` | Run ESLint |
