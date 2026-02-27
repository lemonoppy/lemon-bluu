# Kaiju Keeper

A Discord bot for tracking ISFL sports league statistics, including team rosters, player milestones, game schedules, and fantasy data.

## Features

- **Statistical Leaders** - Passing, rushing, and other aggregate stat leaders
- **Team Commands** - Roster lookups and team info per configured team(s)
- **Milestone Tracking** - Player and team milestone announcements
- **Schedule Updates** - Automated game schedule fetching and posting
- **Fantasy Integration** - Google Sheets integration for fantasy league data
- **Database Sync** - Portal data syncing via admin commands

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) below).

### 3. Run the Bot

```bash
# Development mode with auto-restart
yarn start:dev

# Production mode
yarn start:prod
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|----------|-------------|
| `TOKEN` | Discord bot token (production) |
| `CLIENT_ID` | Discord application/client ID |
| `DEV_TOKEN` | Discord bot token (development) |
| `DEV_CLIENT_ID` | Discord client ID (development) |
| `NODE_ENV` | `development` or `production` |
| `TEAM_SEARCH_KEY` | Team name/abbreviation to configure the bot for |
| `DB_TABLE_PREFIX` | Database table prefix for this team |
| `UPDATE_SERVER_ID` | Discord server ID where index updates are posted |
| `UPDATE_CHANNEL_ID` | Discord channel ID where index updates are posted |
| `BOT_ERROR_CHANNEL_ID` | Discord channel ID for bot error reporting |
| `CDN_CHANNEL_ID` | Discord channel ID used as CDN for file uploads |
| `DEV_TEAM_IDS` | Comma-separated Discord user IDs for bot developers |
| `GM_IDS` | Comma-separated Discord user IDs for team GMs |
| `GOOGLE_API_KEY` | Google API key for Sheets read access |
| `GEMINI_API_KEY` | Google Gemini API key (for AI commands) |
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | Google service account JSON (stringified) |
| `FANTASY_SHEET_ID` | Google Sheet ID for fantasy league data |
| `DATABASE_URL` | PostgreSQL connection string |
| `WEBHOOK_OSK` | Discord webhook URL for Osaka team updates |
| `WEBHOOK_NOLA` | Discord webhook URL for New Orleans team updates |
| `WEBHOOK_BAL` | Discord webhook URL for Baltimore team updates |
| `WEBHOOK_BFB` | Discord webhook URL for Buffalo team updates |

## Project Structure

```
src/
├── commands/
│   ├── admin/      # Admin-only commands (cache, config, schedule)
│   ├── aggregate/  # Stat leader commands (passing, rushing, etc.)
│   ├── db/         # Database commands (game fetching)
│   ├── milestones/ # Player and team milestone tracking
│   └── team/       # Team commands (roster, info)
├── db/             # Database clients (portal, DBClient)
├── events/         # Discord event handlers
├── handlers/       # Command, Event, and Cron loaders
└── lib/
    ├── config/     # Configuration (config.ts, dynamicConfig.ts)
    ├── helpers/    # Player helpers, embeds, buttons
    └── logger.ts   # Logging utility
```

## License

MIT License - see LICENSE file for details
