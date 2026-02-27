# Takoyaki

A Discord bot for managing ISFL/DSFL league operations, including TPE tracking, index updates, fantasy drafts, and community stats.

## Features

- **Index Updates** - Automated TPE tracker and index syncing via Google Apps Script
- **Portal Integration** - Player lookups and stats from the ISFL portal
- **Fantasy** - Draft tracking and combine data from Google Sheets
- **Admin Tools** - Schedule management and cache administration
- **Store** - Community point tracking and rewards

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
| `TEST_SERVER_ID` | Discord server ID for dev/testing |
| `TEST_CHANNEL_ID` | Discord channel ID for dev/testing |
| `UPDATE_SERVER_ID` | Discord server ID where index updates are posted |
| `UPDATE_CHANNEL_ID` | Discord channel ID where index updates are posted |
| `BOT_ERROR_CHANNEL_ID` | Discord channel ID for bot error reporting |
| `CDN_CHANNEL_ID` | Discord channel ID used as CDN for file uploads |
| `DEV_TEAM_IDS` | Comma-separated Discord user IDs for bot developers |
| `GM_IDS` | Comma-separated Discord user IDs for league GMs |
| `TENOR_KEY` | Tenor API key (for GIF commands) |
| `GOOGLE_API_KEY` | Google API key for Sheets read access |
| `GEMINI_API_KEY` | Google Gemini API key (for AI commands) |
| `GOOGLE_SCRIPT_ID` | Google Apps Script deployment ID for TPE tracker |
| `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | Google service account JSON (stringified) |
| `SHEET_ID` | Primary Google Sheet ID |
| `FANTASY_SHEET_ID` | Google Sheet ID for fantasy league data |

## Project Structure

```
src/
├── commands/
│   ├── admin/    # Admin commands (schedule, cache)
│   ├── fantasy/  # Draft and combine lookups
│   ├── index/    # TPE tracker and index update commands
│   ├── misc/     # Utility commands
│   └── portal/   # Portal player lookups
├── db/
│   ├── portal/   # Portal API client
│   └── sheets/   # Google Sheets client (SheetsClient.ts)
├── events/       # Discord event handlers
├── handlers/     # Command, Event, and Cron loaders
└── lib/
    ├── config/   # Configuration (config.ts, dynamicConfig.ts)
    └── logger.ts # Logging utility
```

## License

MIT License - see LICENSE file for details
