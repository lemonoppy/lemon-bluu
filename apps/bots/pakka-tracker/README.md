# pakka-tracker

Discord bot for tracking UVS (Riftbound) tournament events. Built with Discord.js v14 and TypeScript, based on the lemon-bluu bot architecture.

## What's included

- Slash command auto-discovery (root + subdirectory commands)
- Event handler loader
- Cron job handler with dev/prod guard
- Per-user command cooldowns
- Centralized command error handling in `interactionCreate`
- `@lemon-bluu/discord` logger
- Dev/prod token switching via `NODE_ENV`
- UVS event scraper (`src/lib/uvs/`) backed by the official UVS API

## Setup

```bash
cp .env.example .env
# Fill in TOKEN, CLIENT_ID, and optionally DEV_TOKEN / DEV_CLIENT_ID
yarn install
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

## Commands

| Command | Description |
|---|---|
| `/scrape <event_id>` | Scrape a UVS event and show the tracked squad's standings and cut status |
| `/ping` | Replies with Pong! |

The squad (tracked users shown in the squad status section) is configured in `src/lib/uvs/squad.ts`.

## Project structure

```
src/
├── commands/
│   ├── misc/
│   │   └── ping.ts           # Example command
│   └── uvs/
│       └── scrape.ts         # /scrape command
├── events/
│   ├── ready.ts              # Logs when bot is online
│   └── interactionCreate.ts  # Routes slash commands + cooldowns
├── handlers/
│   ├── Command.ts            # Auto-loads commands, registers with Discord API
│   ├── Event.ts              # Auto-loads event files
│   └── Cron.ts               # Initial data load + scheduled jobs
├── lib/
│   ├── config/
│   │   └── config.ts         # Config object
│   ├── logger.ts             # Re-exports logger from @lemon-bluu/discord
│   └── uvs/
│       ├── types.ts          # UVS API response interfaces
│       ├── client.ts         # API client (fetch with timeout)
│       ├── scraper.ts        # scrapePlayerData(eventId) core logic
│       ├── cut-finder.ts     # Swiss cut-line Monte Carlo simulation
│       ├── squad.ts          # Tracked users + squad status evaluation
│       └── format.ts         # Status labels + squad status formatting
└── index.ts                  # Entry point
typings/
├── command.d.ts              # SlashCommand interface
├── event.d.ts                # BotEvent interface
└── index.d.ts                # discord.js Client module augmentation
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
| `yarn lint` | Run ESLint |
