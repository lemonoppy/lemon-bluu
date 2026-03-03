# PBE Scraper

Web scrapers for extracting career fielding statistics from [pbesim.com](http://www.pbesim.com).

Two scraping modes are available:

| Mode | Command | Source | Positions | Best for |
|---|---|---|---|---|
| **2B scraper** | `yarn start` | Fielding pages by year | 2B only | Quick second basemen analysis |
| **All-players scraper** | `yarn scrape-all` | Alphabetical player pages | All positions | Comprehensive fielding database |

## Installation

From the monorepo root:

```bash
yarn install
```

## Commands

```bash
yarn start              # Full 2B scrape (years 2073 → 2017)
yarn new-season         # Add one new season to the 2B dataset
yarn scrape-all         # Full all-players scrape (alphabetical, a–z)
yarn update-all         # Re-scrape recently active players only
yarn test               # Test 2B scraper: 3 players from 2 years
yarn test-all           # Test all-players scraper: 3 players from letter B
yarn test-new-season    # Dry run: preview what yarn new-season would do
yarn build              # Compile TypeScript to build/
yarn lint               # ESLint
yarn format             # Prettier
```

---

## 2B Scraper (`src/scraper.ts`)

Iterates through the historical fielding pages by season (newest to oldest), extracts Second Basemen, and collects each player's career fielding stats (filtered to 2B rows only).

**Key design:** By iterating newest to oldest, each player is scraped once from the most complete career stats available. The scraper is resumable — re-running loads `second_basemen_stats.json` and skips already-scraped players.

**Output files:**
- `second_basemen_stats.json` — nested player objects with stats arrays
- `second_basemen_stats.tsv` — flat format for Google Sheets

**Configuration** (top of `src/scraper.ts`):
- `START_YEAR` / `END_YEAR` — year range to scrape (default: 2017–2073)

### New Season Update

When a new season is released:

```bash
yarn new-season
```

This automatically detects the next season (highest year + 1), scrapes that single season, updates existing players with their latest stats, adds any new players, and outputs:
- `second_basemen_stats.json` / `.tsv` (full updated dataset)
- `season_YYYY_players.tsv` (just the players from the new season)

```
Current data: Seasons 2017–2073
Run: yarn new-season
→ Scrapes season 2074
→ Updates 50 existing players
→ Adds 5 new players
→ Creates season_2074_players.tsv
```

---

## All-Players Scraper (`src/scraper-all.ts`)

Iterates through alphabetical player listing pages (a–z) and captures fielding stats for **all positions**. Tracks `lastActiveSeason` to enable smart incremental updates.

**Initial full scrape** (2–4 hours):
```bash
yarn scrape-all
```

**Incremental update** (30–60 min) — re-scrapes players active within the last 3 years, skips the rest:
```bash
yarn update-all
```

**Output files:**
- `all_players_fielding.json` — nested player objects
- `all_players_fielding.tsv` — flat format for Google Sheets

**Configuration** (top of `src/scraper-all.ts`):
- `CURRENT_SEASON` — update each new season
- `ACTIVITY_THRESHOLD_YEARS` — how many years back counts as "active" (default: 3)

---

## Output Format

### JSON

```json
[
  {
    "name": "Adam-Cole Bay-Bay",
    "url": "http://www.pbesim.com/players/player_3337.html",
    "scrapedFromYear": 2073,
    "careerFieldingStats": [
      {
        "Year/Team/League": "2072 Brew City - R",
        "POS": "2B",
        "G": "108",
        "GS": "108",
        "PO": "190",
        "A": "344",
        "DP": "82",
        "TC": "542",
        "E": "8",
        "PCT": ".985",
        "INN": "953.2",
        "RNG": "5.04",
        "ZR": "-3.2",
        "EFF": ".966",
        "PB": "",
        "RSTA": "",
        "RTO": "",
        "RTO%": ""
      }
    ]
  }
]
```

The all-players format uses `lastActiveSeason` and `scrapedDate` instead of `scrapedFromYear`.

### TSV Columns

| Column | Description |
|---|---|
| Player Name | Full player name |
| Player URL | Link to player page |
| Season | `scrapedFromYear` (2B scraper) or `lastActiveSeason` (all-players) |
| Year/Team/League | Season and team info |
| POS | Position played |
| G | Games |
| GS | Games Started |
| PO | Put Outs |
| A | Assists |
| DP | Double Plays |
| TC | Total Chances |
| E | Errors |
| PCT | Fielding Percentage |
| INN | Innings Played |
| RNG | Range |
| ZR | Zone Rating |
| EFF | Efficiency |
| PB | Passed Balls (catchers only) |
| RSTA | Runners Stolen Against (catchers only) |
| RTO | Runners Thrown Out (catchers only) |
| RTO% | Runner Thrown Out Percentage (catchers only) |

---

## Notes

- Requests are rate-limited: 1s between players, 2s between year/letter pages
- Failed requests are logged but do not stop the run
- Position filtering in the all-players dataset is best done in Google Sheets after export
