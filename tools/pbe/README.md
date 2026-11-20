# PBE Tools

CLI tools for the [PBE](https://forum.pbesim.com) league, in one package
(`@lemon-bluu/pbe`):

| Tool     | Source          | What it does                                              |
| -------- | --------------- | --------------------------------------------------------- |
| Fielding | `src/fielding/` | Career and current-season fielding stats from pbesim.com  |
| Portal   | `src/portal/`   | Draft class export from the Simflow player portal         |
| Forum    | `src/forum/`    | Qualifying usernames from a PBE forum thread              |

Shared helpers live in `src/shared/`. All output is written under the
gitignored `data/<tool>/` directory.

## Setup

Install dependencies from the monorepo root:

```bash
yarn install
```

## Commands

From the monorepo root:

```bash
yarn pbe:scrape-all              # Fielding: full all-players scrape (a–z)
yarn pbe:update-all              # Fielding: re-scrape recently active players
yarn pbe:snapshot [season]       # Fielding: current-season snapshot (TSV)
yarn pbe:portal 66               # Portal: every player drafted in S66
yarn pbe:forum "<thread-url>"    # Forum: qualifying usernames
yarn pbe:forum "<thread-url>" --ai
yarn pbe:test                    # Forum parser tests
```

From `tools/pbe`, the same scripts are `fielding:scrape-all`,
`fielding:update-all`, `fielding:snapshot`, `portal:scrape`, `forum:scrape`,
plus `test`, `build`, `lint`, and `format`.

## Browser profiles

The portal and forum tools sit behind Cloudflare, so they drive an installed
Chromium-based browser (Chrome, Chromium, Brave, Edge, or Vivaldi) instead of
Puppeteer's bundled Chrome for Testing, which avoids the verification loop
caused by its automation fingerprint. Each tool keeps its own persistent,
gitignored profile in `.chrome-profile/portal/` and `.chrome-profile/forum/`,
so Cloudflare clearance and logins survive between runs.

If your browser is installed somewhere unusual, set its executable explicitly:

```bash
PBE_CHROME_EXECUTABLE="/path/to/Google Chrome" yarn pbe:forum "<thread-url>"
```

---

## Fielding (`src/fielding/`)

Extracts career fielding statistics from [pbesim.com](http://www.pbesim.com)
for **all positions**. No credentials or browser needed.

### Full scrape (`scraper.ts`)

Iterates through alphabetical player listing pages (a–z) and captures fielding
stats for all positions. Tracks `lastActiveSeason` to enable incremental
updates.

```bash
yarn pbe:scrape-all   # Initial full scrape (2–4 hours)
yarn pbe:update-all   # Re-scrape players active within the last 3 years (30–60 min)
```

**Output files** in `data/fielding/`:

- `all_players_fielding.json` — nested player objects
- `all_players_fielding.tsv` — flat format for Google Sheets

**Configuration** (top of `src/fielding/scraper.ts`):

- `CURRENT_SEASON` — update each new season
- `ACTIVITY_THRESHOLD_YEARS` — how many years back counts as "active" (default: 3)

### Current-season snapshot (`snapshot.ts`)

Grabs an in-progress read of how the league is fielding **right now**. It walks
the current league player list (`/leagues/league_100_players_*.html`, ~350
active players) and keeps only fielding rows from the target season for all
positions. It never reads or writes `all_players_fielding.{json,tsv}`.

```bash
yarn pbe:snapshot        # Defaults to CURRENT_SEASON + 1 (e.g. 2080)
yarn pbe:snapshot 2081   # Explicit season override
```

**Output file:** `data/fielding/current_season_fielding_{season}.tsv` (same
columns as the complete store)

### Output format

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

TSV columns:

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

Notes:

- Requests are rate-limited: 1s between players, 2s between letter pages
- Failed requests are logged but do not stop the run
- Position filtering is best done in Google Sheets after export

---

## Portal (`src/portal/`)

Extracts a PBE draft class from the
[Simflow player list](https://pbe.simflow.io/view/player_list.php). It calls the
same AJAX endpoint the page's table uses
(`https://pbe.simflow.io/ajax/player_list_data.php`) with the `class` filter set
to the requested season. Requests run inside the browser window, so cookies and
the user-agent match automatically.

```bash
yarn pbe:portal 66
```

The season must be a positive integer. Output is saved as
`data/portal/drafted-players-s{season}.{json,tsv}`.

### First run

The first run opens a browser window. Complete the Cloudflare check if shown,
log in to the portal and tick "remember me". The scraper detects the login on
its own (it waits up to 5 minutes), runs, and closes the window. Later runs
need no interaction until the session expires.

### Output format

```json
[
  {
    "pid": "1014",
    "username": "bjkman",
    "name": "D'Artagnan Gumboot",
    "position": "C/1B/CF",
    "archetype": "Three True Outcomes",
    "tpe": "198",
    "bankAccount": "70417000",
    "team": "Amarillo Armadillos"
  }
]
```

Players are sorted by player ID (PID). The request uses `league=ALL`,
`retired=Exclude`, `filler=Exclude`, and `type=All`, matching the portal's
default view, and pages through results 100 rows at a time.

Field mapping from the portal rows:

- `pid` — parsed from the player link in `name`
- `username` — dropdown toggle text in `username`
- `position` — `positions` (all eligible positions, e.g. `C/2B/LF`)
- `archetype` — `build`
- `tpe` — `tpe`
- `bankAccount` — `p_bank` with `$` and commas removed (the plain `bank` field
  is a small integer, not the account balance)
- `team` — full team name from the team link's `title`

The TSV file uses the same fields as the JSON output, with a header row.

---

## Forum (`src/forum/`)

Collects usernames whose replies in a PBE forum thread either:

- contain more than 150 words, excluding quoted text; or
- contain a link, excluding links inside quotes.

The opening post is excluded. A username appears once if any of that user's
replies qualifies.

```bash
yarn pbe:forum "https://forum.pbesim.com/showthread.php?tid=44287"
```

Complete the Cloudflare check in the opened window if prompted. The command
follows every page in the thread and writes two timestamped files under
`data/forum/`:

- `*.usernames.txt` — one qualifying username per line
- `*.json` — an audit report with each reply's text, word count, links,
  qualification result, permalink, and optional AI review

### Optional AI-authorship review

Set a Gemini API key and add `--ai`:

```bash
GEMINI_API_KEY=your-key yarn pbe:forum \
  "https://forum.pbesim.com/showthread.php?tid=44287" --ai
```

You can put `GEMINI_API_KEY` in the gitignored `tools/pbe/.env` file instead.
`GEMINI_MODEL` optionally overrides the default `gemini-2.5-flash` model.

Only qualifying reply bodies are sent to Google. The report records
`likely_human`, `uncertain`, or `likely_ai` with a confidence value and short
reasons. AI-authorship detection is unreliable and can produce false positives,
so the result is a human-review signal only; it never removes a username.
