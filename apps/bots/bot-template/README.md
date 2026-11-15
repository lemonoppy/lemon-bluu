# bot-template

Discord bot skeleton based on the lemon-bluu bot architecture. Built with Discord.js v14 and TypeScript.

## What's included

- Slash command auto-discovery (root + subdirectory commands)
- Event handler loader with typed event args
- Cron job handler with dev/prod guard
- Role-based permissions via `minRole` and the `UserRole` enum
- Per-user command cooldowns
- Autocomplete handler routing
- `withErrorHandling` wrapper for clean command error recovery
- `@lemon-bluu/discord` logger
- Dev/prod token switching via `NODE_ENV`
- Jest test harness

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
| `TEST_SERVER_ID` | No | Dev guild ID for testing |
| `TEST_CHANNEL_ID` | No | Dev channel ID for testing |
| `ERROR_CHANNEL_ID` | No | Channel to post unhandled errors |
| `DEV_TEAM_IDS` | No | Comma-separated user IDs granted `BOT_OWNER` |
| `MOD_TEAM_IDS` | No | Comma-separated user IDs granted `MODERATOR` |
| `ADMIN_TEAM_IDS` | No | Comma-separated user IDs granted `ADMIN` |

## Project structure

```
src/
├── commands/
│   └── misc/
│       └── ping.ts          # Example command
├── events/
│   ├── error.ts             # Forwards client errors to the logger
│   ├── ready.ts             # Logs when bot is online
│   └── interactionCreate.ts # Routes commands, autocomplete, roles, cooldowns
├── handlers/
│   ├── Command.ts           # Auto-loads commands, registers with Discord API
│   ├── Event.ts             # Auto-loads event files
│   └── Cron.ts              # Initial data load + scheduled jobs
├── lib/
│   ├── config/
│   │   └── config.ts        # Config object, UserRole enum, botEmojis
│   ├── errorHandling.ts     # withErrorHandling() wrapper
│   ├── logger.ts            # Re-exports logger from @lemon-bluu/discord
│   └── role.ts              # checkRole() used by command minRole
├── __tests__/
│   └── setup.ts             # Jest setup
└── index.ts                 # Entry point
jest.config.js               # Jest config
typings/
├── command.d.ts             # SlashCommand interface
├── event.d.ts               # BotEvent interface
└── index.d.ts               # discord.js Client module augmentation
```

## Adding a command

Create a `.ts` file anywhere under `src/commands/`:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { UserRole } from 'src/lib/config/config';
import { withErrorHandling } from 'src/lib/errorHandling';
import { SlashCommand } from 'typings/command';

const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply('Hello!');
};

export default {
  command: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Says hello'),
  execute: withErrorHandling(execute, 'Failed to say hello.'),
  cooldown: 5, // optional: seconds between uses per user
  minRole: UserRole.MODERATOR, // optional: enforced via Config role ID lists
} satisfies SlashCommand;
```

## Adding a cron job

Uncomment/extend `src/handlers/Cron.ts`:

```typescript
import { CronJob } from 'cron';

new CronJob('0 */6 * * *', async () => {
  // runs every 6 hours in production
}).start();
```

## Scripts

| Script | Description |
|---|---|
| `yarn start:dev` | Dev mode with nodemon + pretty logs |
| `yarn start:prod` | Production with ts-node |
| `yarn build` | Compile TypeScript |
| `yarn start:built` | Run compiled output |
| `yarn test` | Run Jest |
| `yarn test:coverage` | Run Jest with coverage |
| `yarn lint` | Run ESLint |
