# PBE Draft Scraper

JSON scraper for extracting a PBE draft class from the
[Simflow player list](https://pbe.simflow.io/view/player_list.php). It calls the
same AJAX endpoint the page's table uses
(`https://pbe.simflow.io/ajax/player_list_data.php`) with the `class` filter set
to the requested season.

The portal sits behind Cloudflare and requires a login, so requests are made
from inside a real Chrome window that uses a persistent profile
(`.chrome-profile/`, gitignored). Cookies and the user-agent therefore match
automatically and nothing needs to be copied by hand.

## Setup

Install dependencies from the monorepo root:

```bash
yarn install
```

Google Chrome (or Chromium, Brave, Edge, Vivaldi) must be installed. Set
`PBE_CHROME_EXECUTABLE` to use a different browser binary.

### First run

The first run opens a browser window. Complete the Cloudflare check if shown,
log in to the portal and tick "remember me". The scraper detects the login on
its own (it waits up to 5 minutes), runs, and closes the window. The profile
keeps the session, so later runs need no interaction. If the session expires,
the window prompts you to log in again.

## Usage

From the tool directory:

```bash
yarn scrape 66
```

Or from the monorepo root:

```bash
yarn workspace @lemon-bluu/pbe-portal-scraper scrape 66
```

The season must be supplied as a positive integer. Output is saved in both JSON
and TSV formats as `drafted-players-s{season}.{json,tsv}` (gitignored).

## Output Format

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
