# MTG Glicko

Glicko-2 rating calculator for MTG cube draft results. Reads historical match data from `src/data.ts` and outputs a per-draft rating history for each player.

## Usage

```bash
yarn start
```

Output is written to `output/mtg_glicko_data.json` (gitignored).

## Adding results

Edit `src/data.ts` — append new `MatchRecord` entries to the `games` array, incrementing `draft` and `round` as appropriate:

```ts
{
  draft: 22,
  round: 1,
  pA: "Nelson",
  pB: "Hersh",
  sA: 1,
  sB: 0,
  winner: "Nelson"
}
```

Then update `TO_DRAFT` at the top of `src/calculator.ts` to include the new draft.

## Output format

```json
[
  {
    "draft": 1,
    "Nelson": 1512.3,
    "Hersh": 1489.7,
    ...
  }
]
```

Players with no games in a draft show `-1`.
