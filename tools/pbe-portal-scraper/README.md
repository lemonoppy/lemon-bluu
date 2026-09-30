# PBE Draft Scraper

JSON scraper for extracting a PBE draft class from the public
[Simflow Players](https://pbe-backend-consolidated-46775724cb31.herokuapp.com/simflow/players)
API. It selects every player whose `drafted` field matches the requested season.

## Setup

Install dependencies from the monorepo root:

```bash
yarn install
```

The player API is public, so no credentials or configuration file is needed.

## Usage

From the tool directory:

```bash
yarn scrape 64
```

Or from the monorepo root:

```bash
yarn workspace @lemon-bluu/pbe-portal-scraper scrape 64
```

The season must be supplied as a positive integer. Output is saved in both JSON
and TSV formats as `drafted-players-s{season}.{json,tsv}` (gitignored).

## Output Format

```json
[
  {
    "pid": "943",
    "username": "mystictoejam",
    "name": "Riley Unova",
    "position": "2B",
    "archetype": "Contact",
    "tpe": "288",
    "bankAccount": "5150000",
    "team": "Louisville Lemurs"
  }
]
```

Players are sorted by external player ID (PID). No league, experience, or
status filter is applied; every row matching the requested `drafted` season is
included.

The TSV file uses the same fields as the JSON output, with a header row:
`pid`, `username`, `name`, `position`, `archetype`, `tpe`, `bankAccount`, and
`team`.

## Consolidated Backend Endpoints

Base URL:
`https://pbe-backend-consolidated-46775724cb31.herokuapp.com`

- `GET /simflow/players` — all Simflow players as JSON. Supports an optional
  `league` query parameter and includes player details, `drafted`,
  `bank_balance`, and nested team data.
- `GET /simflow/players/html` — the same player dataset as an HTML table for
  Google Sheets `IMPORTHTML`.
- `GET /discord/bank/balance?username={username}` — the current bank balance
  for one username.
- `GET /discord/bank/transactions?username={username}` — bank transaction
  history for one username.
- `GET /simflow/teams` — all Simflow teams as JSON.
- `GET /simflow/leagues` — all Simflow leagues as JSON.
- `GET /docs` — interactive Swagger API documentation.
- `GET /openapi.json` — the complete OpenAPI schema.

The `/scrape/*` routes trigger backend refresh jobs rather than simply reading
stored data and should not be used by this scraper.
