# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run build` - Compile TypeScript to JavaScript with type alias resolution
- `npm run start:dev` - Start development server with nodemon and pretty logging
- `npm run start:prod` - Run production server with ts-node
- `npm run start:built` - Run the built JavaScript version
- `npm run start:restart` - Production restart script with auto-recovery
- ESLint available via `npx eslint` (configured with TypeScript and Prettier)

## Architecture Overview

This is a Discord bot template built with Discord.js v14 and TypeScript.

### Core Structure
- **Entry Point**: `src/index.ts` - Initializes Discord client and loads handlers
- **Command System**: Auto-discovery from `src/commands/` and subdirectories via `src/handlers/Command.ts`
- **Event Handling**: Event files in `src/events/` loaded by `src/handlers/Event.ts`
- **Cron Jobs**: Scheduled tasks in `src/handlers/Cron.ts` for periodic tasks

### Key Libraries and Utilities
- **Config**: Configuration system in `src/lib/config/config.ts` with environment-based settings
- **Logger**: Logging utilities in `src/lib/logger.ts`
- **Role Permissions**: Role-based permission checking in `src/lib/role.ts`
- **Help System**: Dynamic help command with button interactions in `src/lib/help.ts`

### Example Commands
- `help` - Interactive help command with buttons
- `ping` - Basic ping/pong command showing latency
- `ask` - AI assistant command using Google Gemini (requires API key)
- `honk` - Fun command example

### Path Resolution
Uses TypeScript path mapping with `src/*` base paths. The `tsc-alias` package resolves these during build.

### Environment Configuration
- Development: Uses `DEV_TOKEN` and `DEV_CLIENT_ID`
- Production: Uses `TOKEN` and `CLIENT_ID`
- Automatic environment detection via `NODE_ENV`
- Copy `.env.example` to `.env` and fill in your bot credentials

### Command Structure
Commands are organized in subdirectories under `src/commands/`:
- `misc/` - Utility and example commands

Each command exports a default object with:
- `command` (SlashCommandBuilder) - The command definition
- `execute` function - The command logic
- Optional `cooldown`, `minRole`, `autocomplete`, `modal` properties

### Adding New Commands
1. Create a new `.ts` file in `src/commands/` or a subdirectory
2. Export a default object implementing the `SlashCommand` interface
3. The command will be automatically discovered and registered