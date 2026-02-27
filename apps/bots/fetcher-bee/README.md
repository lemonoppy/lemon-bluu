# Discord Bot Template

A comprehensive Discord bot template built with Discord.js v14 and TypeScript, featuring a modular command system, event handling, role-based permissions, and cron job support.

## Features

- 🤖 **Modern Discord.js v14** with full TypeScript support
- 📁 **Automatic Command Discovery** - Commands are auto-loaded from files
- 🎛️ **Event Handling System** - Clean event management
- 🔐 **Role-Based Permissions** - Configurable permission levels
- ⏰ **Cron Job Support** - Scheduled tasks and maintenance
- 🆘 **Interactive Help System** - Dynamic help with button navigation
- 🔧 **Environment Configuration** - Development/production modes
- 📝 **Comprehensive Logging** - Built-in logging system

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd discord-bot-template
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your bot credentials:

```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
NODE_ENV=development
```

### 3. Get Bot Credentials

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the token to your `.env` file
5. Copy the Application ID to your `.env` file as `CLIENT_ID`

### 4. Run the Bot

```bash
# Development mode with auto-restart
npm run start:dev

# Production mode
npm run start:prod

# Build and run compiled version
npm run build
npm run start:built
```

## Project Structure

```
src/
├── commands/           # Bot commands
│   ├── help.ts        # Interactive help command
│   └── misc/          # Utility commands
│       ├── ask.ts     # AI assistant (requires Gemini API)
│       ├── honk.ts    # Fun example command
│       └── ping.ts    # Basic ping command
├── events/            # Discord event handlers
│   ├── ready.ts       # Bot ready event
│   ├── interactionCreate.ts  # Slash command handling
│   └── ...
├── handlers/          # System handlers
│   ├── Command.ts     # Command loader
│   ├── Event.ts       # Event loader
│   └── Cron.ts        # Cron job scheduler
├── lib/               # Utilities and helpers
│   ├── config/        # Configuration
│   ├── helpers/       # Helper functions
│   └── ...
└── index.ts          # Entry point
```

## Adding Commands

Create a new file in `src/commands/` (or subdirectory):

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('example')
    .setDescription('An example command'),

  execute: async (interaction) => {
    await interaction.reply('Hello World!');
  },

  cooldown: 5, // Optional: cooldown in seconds
  minRole: 0,  // Optional: minimum role required
} satisfies SlashCommand;
```

## Configuration

### Environment Variables

- `TOKEN` - Your bot's token
- `CLIENT_ID` - Your bot's application ID
- `DEV_TOKEN` / `DEV_CLIENT_ID` - Development bot credentials
- `NODE_ENV` - Set to 'development' or 'production'
- `GEMINI_API_KEY` - Optional: For AI assistant command

### User Roles

Configure in `src/lib/config/config.ts`:

```typescript
export enum UserRole {
  REGULAR = 0,    // Default users
  MODERATOR = 1,  // Moderators
  ADMIN = 2,      // Administrators
  BOT_OWNER = 3,  // Bot owners
}
```

## Example Commands

### Basic Ping Command
```typescript
// Simple latency check
/ping
```

### Interactive Help
```typescript
// Shows all available commands with buttons
/help
```

## Cron Jobs

Add scheduled tasks in `src/handlers/Cron.ts`:

```typescript
import { CronJob } from 'cron';

// Daily task at midnight
new CronJob('0 0 * * *', async () => {
  console.log('Daily task running...');
  // Your task here
}).start();
```

## Development Scripts

- `npm run start:dev` - Development with auto-restart and pretty logs
- `npm run start:prod` - Production mode
- `npm run build` - Compile TypeScript
- `npm run start:built` - Run compiled version
- `npm run start:restart` - Production with auto-recovery

## Dependencies

### Core
- **discord.js** - Discord API wrapper
- **typescript** - Type safety
- **dotenv** - Environment variables
- **cron** - Scheduled tasks

### Optional
- **@google/genai** - Google Gemini AI (for ask command)
- **axios** - HTTP requests
- **lodash** - Utility functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the documentation in `CLAUDE.md`
- Review example commands in `src/commands/`
- Open an issue on GitHub
