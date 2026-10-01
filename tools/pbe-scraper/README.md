# PBE Scraper

Web scraper for extracting career fielding statistics from [pbesim.com](http://www.pbesim.com) for **all positions**.

## Installation

From the monorepo root:

```bash
yarn install
```

## Commands

```bash
yarn scrape-all         # Full all-players scrape (alphabetical, a–z)
yarn update-all         # Re-scrape recently active players only
yarn snapshot [season]  # Current-season fielding snapshot (TSV only)
yarn build              # Compile TypeScript to build/
yarn lint               # ESLint
yarn format             # Prettier
```

---

## Scraper (`src/scraper.ts`)

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

**Configuration** (top of `src/scraper.ts`):

- `CURRENT_SEASON` — update each new season
- `ACTIVITY_THRESHOLD_YEARS` — how many years back counts as "active" (default: 3)

---

## Current-Season Snapshot (`src/snapshot.ts`)

Grabs an in-progress read of how the league is fielding **right now**. It walks the
current league player list (`/leagues/league_100_players_*.html`, ~350 active
players) and keeps only fielding rows from the target season for **all positions**.

This is independent of the complete store — it never reads or writes
`all_players_fielding.{json,tsv}`.

```bash
yarn snapshot           # Defaults to CURRENT_SEASON + 1 (e.g. 2080)
yarn snapshot 2081      # Explicit season override
```

**Output file:** `current_season_fielding_{season}.tsv` (same columns as the complete store)

---

## Output Format

### JSON

```json
[
  {
    "name": "Adam-Cole Bay-Bay",
    "url": "http://www.pbesim.com/players/player_3337.html",
    "lastActiveSeason": 2079,
    "scrapedDate": "2079-01-01T00:00:00.000Z",
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

### TSV Columns

| Column           | Description                                  |
| ---------------- | -------------------------------------------- |
| Player Name      | Full player name                             |
| Player URL       | Link to player page                          |
| Season           | `lastActiveSeason`                           |
| Year/Team/League | Season and team info                         |
| POS              | Position played                              |
| G                | Games                                        |
| GS               | Games Started                                |
| PO               | Put Outs                                     |
| A                | Assists                                      |
| DP               | Double Plays                                 |
| TC               | Total Chances                                |
| E                | Errors                                       |
| PCT              | Fielding Percentage                          |
| INN              | Innings Played                               |
| RNG              | Range                                        |
| ZR               | Zone Rating                                  |
| EFF              | Efficiency                                   |
| PB               | Passed Balls (catchers only)                 |
| RSTA             | Runners Stolen Against (catchers only)       |
| RTO              | Runners Thrown Out (catchers only)           |
| RTO%             | Runner Thrown Out Percentage (catchers only) |

---

## Notes

- Requests are rate-limited: 1s between players, 2s between letter pages
- Failed requests are logged but do not stop the run
- Position filtering is best done in Google Sheets after export
