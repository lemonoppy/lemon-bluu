import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import {
  FantasyAdpPlayer,
  FantasyDraftPick,
  FantasyGroup,
  FantasyPlayer,
  FantasyPlayerPoints,
  FantasyRosterEntry,
  FantasyRosteredPlayer,
  FantasySeason,
  FantasyTeam,
  FantasyUser,
} from 'typings/fantasy';

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_CONCURRENCY = 8;
const FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

const round2 = (value: number) => Math.round(value * 100) / 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const isTransientNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === 'TypeError' && error.message === 'fetch failed') {
    return true;
  }

  const code =
    (error as { code?: string }).code ??
    (error.cause as { code?: string } | undefined)?.code;

  return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
};

// The fantasy API returns 160+ teams; firing every request at once causes
// intermittent connection timeouts, so fan out through a small worker pool.
const mapWithConcurrency = async <T, R>(
  items: Array<T>,
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<Array<R>> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
};

type SeasonsResponse = { seasons: Array<FantasySeason> };
type GroupsResponse = { groups: Array<FantasyGroup> };
type TeamsResponse = { teams: Array<FantasyTeam> };
type TeamResponse = { rosterHistory: Array<FantasyRosterEntry> };
type DraftResponse = { picks: Array<FantasyDraftPick> };
type PlayerPointsResponse = { players: Array<FantasyPlayerPoints> };

export class FantasyApiClient {
  #adpPlayers: Array<FantasyAdpPlayer> = [];
  #players: Array<FantasyPlayer> = [];
  #rosteredPlayers: Array<FantasyRosteredPlayer> = [];
  #users: Array<FantasyUser> = [];

  #loaded = false;
  #lastLoadTimestamp = 0;
  #loading: Promise<void> | null = null;

  async #get<T>(path: string): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await fetch(`${Config.fantasyApiUrl}${path}`);
        if (!response.ok) {
          throw new Error(`Fantasy API ${path} returned ${response.status}`);
        }
        return response.json() as Promise<T>;
      } catch (error) {
        if (attempt >= FETCH_ATTEMPTS || !isTransientNetworkError(error)) {
          throw error;
        }

        logger.warn(
          `Fantasy API ${path} request failed (attempt ${attempt}/${FETCH_ATTEMPTS}); retrying`,
          error,
        );
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }

  async #load(): Promise<void> {
    const { seasons } = await this.#get<SeasonsResponse>('/seasons');
    const season = seasons.find((entry) => entry.isCurrent);
    if (!season) {
      throw new Error('Fantasy API returned no current season');
    }

    const { groups } = await this.#get<GroupsResponse>(
      `/groups?season=${season.number}`,
    );

    const teamsByGroup = await mapWithConcurrency(
      groups,
      FETCH_CONCURRENCY,
      (group) => this.#get<TeamsResponse>(`/groups/${group.id}/teams`),
    );
    const teams = teamsByGroup.flatMap((response) => response.teams);

    const [teamDetails, drafts, playerPoints] = await Promise.all([
      mapWithConcurrency(teams, FETCH_CONCURRENCY, (team) =>
        this.#get<TeamResponse>(`/teams/${team.id}`),
      ),
      mapWithConcurrency(groups, FETCH_CONCURRENCY, (group) =>
        this.#get<DraftResponse>(`/groups/${group.id}/draft`),
      ),
      this.#get<PlayerPointsResponse>(
        `/players/points?season=${season.number}`,
      ),
    ]);

    const groupById = new Map(groups.map((group) => [group.id, group]));
    const pointsByPlayerSeasonId = new Map(
      playerPoints.players.map((player) => [player.playerSeasonId, player]),
    );

    const stintScore = (entry: FantasyRosterEntry) => {
      const weekScores =
        pointsByPlayerSeasonId.get(entry.playerSeasonId)?.weekScores ?? {};
      return Object.entries(weekScores).reduce((total, [week, score]) => {
        const weekNumber = Number(week);
        const onRoster =
          weekNumber >= entry.startWeek &&
          (entry.endWeek === null || weekNumber <= entry.endWeek);
        return onRoster ? total + score : total;
      }, 0);
    };

    const teamSnapshots = teams.map((team, index) => {
      const group = groupById.get(team.groupId);
      if (!group) {
        throw new Error(`Fantasy API team ${team.id} has no group`);
      }
      const history = teamDetails[index].rosterHistory;
      return {
        team,
        group,
        history,
        total: round2(
          history.reduce((sum, entry) => sum + stintScore(entry), 0),
        ),
      };
    });

    const byScore = (
      a: (typeof teamSnapshots)[number],
      b: (typeof teamSnapshots)[number],
    ) => b.total - a.total || a.team.ownerName.localeCompare(b.team.ownerName);

    const overallRanks = new Map<number, number>();
    [...teamSnapshots]
      .sort(byScore)
      .forEach((snapshot, index) =>
        overallRanks.set(snapshot.team.id, index + 1),
      );

    const teamsByGroupId = new Map<
      number,
      Array<(typeof teamSnapshots)[number]>
    >();
    for (const snapshot of teamSnapshots) {
      const groupTeams = teamsByGroupId.get(snapshot.group.id) ?? [];
      groupTeams.push(snapshot);
      teamsByGroupId.set(snapshot.group.id, groupTeams);
    }

    const groupRanks = new Map<number, number>();
    for (const groupTeams of teamsByGroupId.values()) {
      [...groupTeams]
        .sort(byScore)
        .forEach((snapshot, index) =>
          groupRanks.set(snapshot.team.id, index + 1),
        );
    }

    const users: Array<FantasyUser> = teamSnapshots.map(
      ({ team, group, total }) => ({
        username: team.ownerName,
        group: group.number,
        groupName: group.name,
        score: total,
        rank: groupRanks.get(team.id) ?? 0,
        overall: overallRanks.get(team.id) ?? 0,
      }),
    );

    const rosteredPlayers: Array<FantasyRosteredPlayer> =
      teamSnapshots.flatMap(({ team, group, history }) =>
        history.map((entry) => ({
          username: team.ownerName,
          group: group.number,
          rosterPosition: entry.rosterSlot,
          name: entry.name,
          position: entry.position,
          team: entry.realTeam,
          start: entry.startWeek,
          end: entry.endWeek ?? undefined,
          score: round2(stintScore(entry)),
        })),
      );

    const players: Array<FantasyPlayer> = playerPoints.players.map(
      (player) => ({
        name: player.name,
        position: player.position,
        team: player.realTeam,
        score: player.total,
      }),
    );

    const adpBuckets = new Map<
      string | number,
      { player: string; team: string; position: string; picks: number[] }
    >();
    for (const draft of drafts) {
      for (const pick of draft.picks) {
        const key = pick.playerSeasonId ?? pick.playerName;
        if (key === null || key === undefined) {
          continue;
        }
        const bucket = adpBuckets.get(key) ?? {
          player: pick.playerName ?? String(key),
          team: pick.realTeam ?? '',
          position: pick.position ?? '',
          picks: [],
        };
        bucket.picks.push(pick.pick);
        adpBuckets.set(key, bucket);
      }
    }

    const adpPlayers: Array<FantasyAdpPlayer> = [...adpBuckets.values()].map(
      ({ player, team, position, picks }) => {
        const sorted = [...picks].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        const median =
          sorted.length % 2 === 0
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];
        return {
          player,
          team,
          position,
          adp: picks.reduce((sum, pick) => sum + pick, 0) / picks.length,
          median,
          count: picks.length,
        };
      },
    );

    this.#adpPlayers = adpPlayers;
    this.#players = players;
    this.#rosteredPlayers = rosteredPlayers;
    this.#users = users;
  }

  async #runLoad(): Promise<void> {
    if (!this.#loading) {
      this.#loading = this.#load().finally(() => {
        this.#loading = null;
      });
    }
    return this.#loading;
  }

  async #ensureLoaded(): Promise<void> {
    if (this.#loaded && Date.now() - this.#lastLoadTimestamp < CACHE_TTL_MS) {
      return;
    }

    try {
      await this.#runLoad();
      this.#loaded = true;
      this.#lastLoadTimestamp = Date.now();
    } catch (error) {
      if (!this.#loaded) {
        throw error;
      }
      logger.error('Fantasy API refresh failed; serving cached data', error);
    }
  }

  async getAdpPlayers(): Promise<Array<FantasyAdpPlayer>> {
    await this.#ensureLoaded();
    return this.#adpPlayers;
  }

  async getPlayers(): Promise<Array<FantasyPlayer>> {
    await this.#ensureLoaded();
    return this.#players;
  }

  async getRosteredPlayers(): Promise<Array<FantasyRosteredPlayer>> {
    await this.#ensureLoaded();
    return this.#rosteredPlayers;
  }

  async getUsers(): Promise<Array<FantasyUser>> {
    await this.#ensureLoaded();
    return this.#users;
  }

  async reload(): Promise<void> {
    await this.#runLoad();
    this.#loaded = true;
    this.#lastLoadTimestamp = Date.now();
  }
}

export const FantasyClient = new FantasyApiClient();
