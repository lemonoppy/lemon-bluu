# Public fantasy API

Base path: `/api/isfl/v1/public`

All endpoints accept anonymous `GET` requests and return JSON. No API key,
login, or cookies are required. Cross-origin browser requests are supported
(`Access-Control-Allow-Origin: *`); use `credentials: "omit"` when fetching
from another website. `OPTIONS` is supported. Responses are not cached.

## Endpoints

| Endpoint | Returns |
| --- | --- |
| `/seasons` | All configured fantasy seasons, newest first, with `isCurrent` |
| `/groups?season=60` | All groups in the requested season |
| `/groups/{groupId}/teams` | Group details and all its fantasy teams |
| `/teams/{teamId}` | Fantasy team details, current roster, and roster history with week boundaries |
| `/groups/{groupId}/draft` | Group, draft room state, teams, picks, roster slots, and number of rounds |
| `/players?season=60` | All eligible players in the requested season |
| `/players/points?season=60` | Eligible players' weekly fantasy points and season totals |

`season` is the **season number**, not a database ID. It is optional on
`/groups`, `/players`, and `/players/points`; omitting it selects the current
active season. Explicit season requests can retrieve historical seasons.
There is no fallback if a requested season does not exist.

Group and team paths use database IDs returned by this API, not group numbers.
Those IDs already identify a season; season query parameters do not change them.
All data is scoped to the ISFL Fantasy league.

## Response shapes

Season-scoped responses contain `season` with `id`, `leagueSeasonId`, `number`,
`name`, and `isCurrent`, plus `groups` or `players` as appropriate. `/seasons`
returns `{ "seasons": [...] }` with the same season fields.

Groups contain `id`, `number`, `name`, and `leagueSeasonId`.
`/groups/{groupId}/teams` returns `{ "group": {...}, "teams": [...] }`.
Teams contain `id`, `name`, `abbreviation`, `groupId`, `leagueSeasonId`,
`draftPosition`, and the owner's public display name (`ownerName`).

`/teams/{teamId}` returns `{ "team": {...}, "roster": [...], "rosterHistory": [...] }`.
Roster entries contain `membershipId`, `playerSeasonId`, `playerId`, `name`,
`position`, `realTeam`, `rosterSlot`, and `slotDefinitionId`, plus:

| Field | Meaning |
| --- | --- |
| `acquisitionType` | Stored acquisition type, such as `draft` or `waiver` (admin additions can also use `waiver`) |
| `startWeek` | First scoring week on this team, inclusive; defaults to 1 when no acquisition week is stored |
| `endWeek` | Last scoring week on this team, inclusive; `null` means no release, and 0 means released before Week 1 |
| `droppedWeek` | First week off the roster for this stint (`endWeek + 1`), or `null` if not released |
| `isActive` | Whether this membership is currently retained (not released) |

`roster` still includes only current memberships. For a historical team, this
is its retained roster. `rosterHistory` includes both current and released
memberships with the same fields. Both exclude administratively removed
memberships and follow roster slot/name order, with membership ID breaking ties.
Each stint has its own `membershipId`, so a player dropped and later picked up
can appear more than once. These are the stored, corrected roster intervals,
not an immutable transaction audit or a list of pending waiver requests.

For example, a waiver pickup rostered for Weeks 2 through 6 has
`acquisitionType: "waiver"`, `startWeek: 2`, `endWeek: 6`, `droppedWeek: 7`,
and `isActive: false`. Its replacement starting Week 7 has `startWeek: 7`.
A preseason release has `startWeek: 1` and `endWeek: 0` and contributes no
scoring weeks. Current status is independent of whether a week's scores exist.
To reconstruct a roster for a particular week:

```js
const { rosterHistory } = await get(`/teams/${teamId}`);
const rosterForWeek = rosterHistory.filter(player =>
  player.startWeek <= week && (player.endWeek === null || week <= player.endWeek)
);
```

`/players` entries contain `playerSeasonId`, `playerId`, `name`, `position`,
and `realTeam`. Eligibility follows the season's draft pool: ISFL players
with a nonblank real team. This includes players already drafted or rostered;
it is the full eligible pool, not group-specific free agents.
`playerId` identifies a player across seasons; `playerSeasonId` identifies
that player's record in a specific season.

`/players/points` adds `weeks` to the response and `weekScores` and `total`
to each player:

```json
{
  "season": { "id": 9, "leagueSeasonId": 12, "number": 60, "name": "Season 60", "isCurrent": true },
  "weeks": [1, 2],
  "players": [{
    "playerSeasonId": 5,
    "playerId": 3,
    "name": "Example Player",
    "position": "QB",
    "realTeam": "TEST",
    "weekScores": { "1": 20.5, "2": 0 },
    "total": 20.5
  }]
}
```

Points are JSON numbers, including zero and negative scores. Missing scores
are omitted from `weekScores`; an unscored player has `{}` and a total of `0`.
`weeks` lists weeks with recorded scores in ascending order. Totals use the
requested season's fantasy scoring and do not depend on roster membership.

Draft responses contain `group`, `room`, `teams`, `picks`, `slots`, and `rounds`.
`room` is `null` if a room has not been created; otherwise it contains `id`,
`status`, `currentPick`, `pickSeconds`, `deadline`, and `startedAt`.
Picks are ordered by pick number and contain `pick`, `teamId`, `playerSeasonId`,
`playerName`, `position`, `realTeam`, `rosterSlot`, `slotDefinitionId`, and
`ownerName`. Imported picks may have null team or player IDs. Slot entries
contain `id`, `code`, `name`, and `count`. Draft reads return stored state
without advancing the clock. Private draft queues are not included.

## Examples

```js
const base = "https://YOUR_FANTASY_HOST/api/isfl/v1/public";
const get = async (path) => {
  const response = await fetch(`${base}${path}`, { credentials: "omit" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

const { groups } = await get("/groups");
if (groups.length) {
  const { teams } = await get(`/groups/${groups[0].id}/teams`);
  if (teams.length) console.log(await get(`/teams/${teams[0].id}`));
  console.log(await get(`/groups/${groups[0].id}/draft`));
}
console.log(await get("/players"));
console.log(await get("/players/points?season=60"));
```

## Errors and empty results

Errors have the shape `{ "error": "message" }`.

- `400`: invalid season number, repeated season parameter, or invalid group/team ID.
- `404`: unknown endpoint, group, team, or season; also returned when no current season exists and none was requested.
- `500`: data could not be loaded; database details are not returned.

Existing resources with no children return `200` with empty arrays. These
endpoints return complete collections without pagination.

Run the automated API checks with `node scripts/test-public-api.mjs`.
