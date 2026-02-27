# Kaiju Keeper Setup Guide

This Discord bot can be configured to work with any ISFL or DSFL team. While it's called "Kaiju Keeper," it's designed to be flexible and work for any team in the league.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/kaiju-keeper.git
   cd kaiju-keeper
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure your team**
   - Copy `.env.example` to `.env`
   - Set up your team configuration (see Team Configuration section below)
   - Add your Discord bot token

4. **Set up database tables**
   - Create PostgreSQL tables with your team's prefix (e.g., `baltimore_passing`, `arizona_rushing`, etc.)
   - See Database Setup section below

5. **Run the bot**
   ```bash
   # Development mode (with hot reload and pretty logs)
   npm run start:dev
   
   # Production mode
   npm run start:prod
   ```

## Team Configuration

The bot supports two flexible methods for team configuration:

### Method 1: Single Search Key (Simplest)

Set one environment variable that can match team name, abbreviation, location, or ID:

```env
# Any of these work for Osaka Kaiju:
TEAM_SEARCH_KEY=osaka
TEAM_SEARCH_KEY=kaiju  
TEAM_SEARCH_KEY=OSK
TEAM_SEARCH_KEY=9

# Examples for other teams:
TEAM_SEARCH_KEY=baltimore     # Baltimore Hawks
TEAM_SEARCH_KEY=hawks         # Baltimore Hawks  
TEAM_SEARCH_KEY=BAL          # Baltimore Hawks
TEAM_SEARCH_KEY=1            # Baltimore Hawks

TEAM_SEARCH_KEY=arizona      # Arizona Outlaws
TEAM_SEARCH_KEY=AZ           # Arizona Outlaws
```

### Method 2: Guild-Based (Multi-Server Support)

Configure different teams for different Discord servers by editing `src/lib/config/config.ts`:

```typescript
guildTeamMap: {
  '602893231621144586': 'osaka',     // Osaka Kaiju server
  '123456789012345678': 'baltimore', // Baltimore Hawks server  
  '123456789012345679': 'arizona',   // Arizona Outlaws server
}
```

This method automatically detects which team to use based on which Discord server the command is run in.

### Available Teams

You can find all available teams in `src/lib/teams.ts`. Use the validation script to test:

```bash
# Test team search keys
node scripts/validate-team-config.js osaka
node scripts/validate-team-config.js baltimore  
node scripts/validate-team-config.js AZ
node scripts/validate-team-config.js 1
```

### Discord Configuration

```env
# Production bot token
TOKEN=your_discord_bot_token_here

# Development bot token (optional)
DEV_TOKEN=your_dev_bot_token_here

# Set to 'development' for dev mode
NODE_ENV=development

# Test server for development
TEST_SERVER_ID=your_test_server_id
TEST_CHANNEL_ID=your_test_channel_id
```

## Database Setup

The bot expects PostgreSQL tables with your team's prefix. For example, if your `DB_TABLE_PREFIX` is `baltimore`, you'll need:

- `baltimore_games`
- `baltimore_passing` 
- `baltimore_rushing`
- `baltimore_receiving`
- `baltimore_kicking`
- `baltimore_punting`
- `baltimore_defense`
- `baltimore_other`

### Database Schema

Each stat table should include standard football statistics plus these required fields:
- `season` (integer) - Season number
- `week` (integer) - Week number  
- `pid` (integer) - Player ID
- `firstname` (text) - Player first name
- `lastname` (text) - Player last name
- `onteam` (boolean) - Whether player is currently on team

### Player ID Management

The bot automatically manages player IDs in the database. When scraping stats, it will:
1. Check existing player mappings in the database
2. Assign new IDs to new players 
3. Update the player mapping table

## Available Commands

Once configured, your bot will have these slash commands:

- `/roster` - Show current team roster
- `/team-info` - Show franchise records and current season schedule  
- `/milestones` - Show team milestones (franchise-level)
- `/player-milestones` - Show upcoming player milestones
- `/scrape-stats` - Scrape game statistics (admin only)
- Various leaderboard commands (`/passing-leaders`, `/rushing-leaders`, etc.)

## Development 

### File Structure

- `src/commands/` - Discord slash commands
- `src/lib/config/` - Configuration management
- `src/lib/teams.ts` - Team definitions
- `src/lib/teamInfo.ts` - Current team helper functions
- `src/db/` - Database clients and utilities

### Adding a New Team

1. Add the team to `src/lib/teams.ts` with a unique ID
2. Create database tables with the team's prefix
3. Set environment variables for the new team
4. The bot will automatically use the new configuration

### Customization

- **Colors/Branding**: Team colors and logos are automatically pulled from the team configuration
- **Database Schema**: Modify table structures in the database client files
- **Commands**: Add new commands in `src/commands/`
- **Embeds**: Customize Discord embed styling in `src/lib/embed.ts`

## Troubleshooting

### Common Issues

1. **"Team with ID X not found"** - Check your `TEAM_ID` environment variable matches a team in `src/lib/teams.ts`

2. **Database table not found** - Ensure your database tables use the correct `DB_TABLE_PREFIX`

3. **Bot not responding** - Verify your Discord bot token and permissions

4. **Stats not scraping** - Check that your team ID corresponds to the correct team on the portal

### Logging

The bot uses structured logging. In development mode (`NODE_ENV=development`), logs are pretty-printed. In production, logs are JSON formatted for easier parsing.

## Contributing

This bot is designed to be team-agnostic. When adding features:

1. Use `CURRENT_TEAM` instead of hardcoded team references
2. Use `TeamConfig.dbTablePrefix` for database table names
3. Test with multiple team configurations
4. Update this documentation for any new configuration options

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code documentation in `CLAUDE.md`
3. Open an issue on GitHub with your configuration and error details