# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `yarn build` or `npm run build` - Compiles TypeScript and resolves path aliases
- **Development**: `yarn start:dev` or `npm run start:dev` - Runs with nodemon, hot reload, and pretty logs
- **Production**: `yarn start:prod` or `npm run start:prod` - Runs directly with ts-node
- **Built version**: `yarn start:built` or `npm run start:built` - Runs compiled JavaScript from build/

## Architecture

This is a Discord bot for sports league statistics (SHL/hockey) with the following structure:

### Core Components
- **Entry point**: `src/index.ts` - Initializes Discord client and loads handlers
- **Handlers**: `src/handlers/` - Command, Event, and Cron job handlers using dynamic loading
- **Commands**: `src/commands/` organized by category:
  - `admin/` - Administrative commands (cache, config, schedule updates)
  - `aggregate/` - Statistical leader commands (passing, rushing, etc.)
  - `db/` - Database operations (game fetching)
  - `milestones/` - Player and team milestone tracking
  - `team/` - Team-specific commands (roster, info)

### Data Layer
- **Database**: `src/db/DBClient.ts` - Main database client, `PortalClient.ts` for portal access
- **Users**: SQLite databases for user management, commands, and Discord moderators
- **Players**: JSON file for player ID mappings

### Utilities
- **Config**: Dynamic configuration system in `src/lib/config/`
- **Logging**: Pino logger with pretty printing in development
- **Embeds**: Discord embed utilities for consistent formatting
- **Helpers**: Player helpers, buttons, menus for Discord interactions

### Environment Setup
- Uses `.env` files for tokens (TOKEN for prod, DEV_TOKEN for dev)
- NODE_ENV=development switches between dev/prod tokens and enables pretty logging
- Path aliases configured in tsconfig.json (`src/*` maps to `src/*`)

### Key Dependencies
- Discord.js v14 for bot functionality
- TypeScript with strict mode enabled
- PostgreSQL (pg) for database operations
- Google APIs for spreadsheet integration
- Cheerio for web scraping
- Cron for scheduled tasks