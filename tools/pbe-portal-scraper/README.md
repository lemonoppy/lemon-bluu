# PBE Draft Scraper

Puppeteer-based scraper for extracting draft class data from [pbe.simflow.io](https://pbe.simflow.io). Logs in, navigates the MiLPBE player list, filters to XP=1 (rookies), visits each player page, and collects name, position, archetype, TPE, team, and bank account.

## Setup

1. Copy the example config and add your credentials:

   ```bash
   cp config.example.json config.json
   ```

   ```json
   {
     "username": "your_username",
     "password": "your_password",
     "loginUrl": "https://pbe.simflow.io/index.php"
   }
   ```

   `config.json` is gitignored — never commit credentials.

2. Install dependencies from the monorepo root:

   ```bash
   yarn install
   ```

## Usage

From the tool directory:
```bash
yarn scrape    # Run the scraper for the configured SEASON
```

Or from the monorepo root:
```bash
yarn workspace @lemon-bluu/pbe-portal-scraper scrape
```

Edit the `SEASON` constant at the top of `src/scraper.ts` to target a different season.

Output is saved to `drafted-players-s{SEASON}.json` (gitignored).

## Output Format

```json
[
  {
    "pid": "501",
    "username": "player_username",
    "name": "Player Name",
    "position": "C",
    "archetype": "Two-Way",
    "tpe": "350",
    "bankAccount": "5000000",
    "team": "Team Name"
  }
]
```

Players are sorted by PID (ascending). Only XP=1 players (current rookies) are included.

## Debug Scripts

Located in `src/debug/`. Useful for inspecting page structure when the site changes:

```bash
yarn debug-page        # Inspect draftee list page structure (no login required)
yarn debug-player      # Inspect a single player page (pid=501)
yarn debug-all-xp      # Log XP distribution across all MiLPBE players
yarn debug-filter      # Inspect how bootstrap-table hides rows after XP filter
yarn debug-table       # Inspect label/input structure on player page
yarn debug-xp-filter   # Inspect table headers and inputs on MiLPBE player list
```

All debug scripts open a visible browser window and keep it open for 30–60 seconds for manual inspection.
