# ISFL Draft Order

CLI tool that computes the upcoming ISFL draft order based on the current (or any past) season's standings and playoff results.

## Installation

From the monorepo root:

```bash
yarn install
```

## Commands

```bash
yarn start              # Compute draft order for the current season
yarn start --season=58  # Compute draft order for a specific past season
yarn build              # Compile TypeScript to build/
yarn lint               # ESLint
yarn format             # Prettier
```

From the monorepo root you can also run:

```bash
yarn isfl-draft-order   # Alias for yarn workspace @lemon-bluu/isfl-draft-order start
```

## Data Source

All data is fetched from the ISFL portal API:

| Endpoint | Purpose |
|---|---|
| `portal.sim-football.com/api/isfl/v1/season` | Detect current season number |
| `portal.sim-football.com/api/isfl/v1/standings?season=N` | Regular season records, all game results, playoff bracket |

The standings response includes:
- `regularSeason` — W/L/T, points for/against, and differential per team
- `games` — all regular season game results (used for H2H and common opponents tiebreakers)
- `postseason` — playoff game results by week (used to determine elimination rounds)

## Draft Order Rules

### Ordering

1. **Non-playoff teams first** (worst record = pick 1)
2. **Playoff teams after**, grouped by elimination round (earliest out = earlier pick)
   - Wild Card losers → Conference losers → Runner-up → Champion (last pick)

### Tiebreakers (applied in order)

| Priority | Method | Notes |
|---|---|---|
| 1 | Head-to-Head | W/L record in games between tied teams only |
| 2 | Point Differential | Season-long `pf - pa` |
| 3 | Common Opponents | Win% vs opponents all tied teams faced |
| 4 | Coinflip | `Math.random()` shuffle; logged to stdout |

For 3+ teams tied in H2H: the team with the most H2H wins is placed at the latest pick within the group, then tiebreakers restart for the remaining teams.

## Example Output

```
ISFL Season 58 Draft Order
==========================
Pick  Team                           Record    Notes
----------------------------------------------------------------------
   1  Yellowknife Wraiths (YKW)      4-12-0
   2  New Orleans Second Line (NOLA) 6-10-0    Tiebreaker: PD
   3  New York Silverbacks (NYS)     6-10-0    Tiebreaker: PD
   4  Austin Copperheads (AUS)       7-9-0     Tiebreaker: PD
   5  Orange County Otters (OCO)     7-9-0     Tiebreaker: PD
   6  Cape Town Crash (CTC)          8-8-0     Tiebreaker: H2H
   7  Sarasota Sailfish (SAR)        8-8-0     Tiebreaker: H2H
   8  Osaka Kaiju (OSK)              8-8-0     Tiebreaker: H2H
   9  Black Forest Brood (BFB)       8-8-0     Lost: Wild Card
  10  San Jose Sabercats (SJS)       9-7-0     Lost: Wild Card
  11  Colorado Yeti (COL)            9-7-0     Lost: Conference
  12  Arizona Outlaws (AZ)           11-5-0    Lost: Conference
  13  Baltimore Hawks (BAL)          10-6-0    Runner-up
  14  Honolulu Hahalua (HON)         11-5-0    Champion
```

## Notes

- If the current season has no postseason data yet (season still in progress), all teams are treated as non-playoff teams and sorted by record only.
- The `--season=N` flag is useful for verifying past draft orders or testing the algorithm.
