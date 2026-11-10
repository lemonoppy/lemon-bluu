import type {
  FantasyDraftPick,
  FantasyGroup,
  FantasyPlayerPoints,
  FantasyRosterEntry,
  FantasySeason,
  FantasyTeam,
} from 'typings/fantasy';

global.fetch = jest.fn();

jest.mock('src/lib/config/config', () => ({
  Config: {
    fantasyApiUrl: 'https://mock-fantasy.test',
  },
}));

jest.mock('src/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { FantasyApiClient } from '../FantasyClient';

const season = (number: number, isCurrent: boolean): FantasySeason => ({
  id: number,
  leagueSeasonId: number,
  number,
  name: `Season ${number}`,
  isCurrent,
});

const group = (id: number, number: number, name: string): FantasyGroup => ({
  id,
  number,
  name,
  leagueSeasonId: 2,
});

const team = (
  id: number,
  ownerName: string,
  groupId: number,
): FantasyTeam => ({
  id,
  name: `${ownerName}'s Team`,
  abbreviation: ownerName,
  groupId,
  leagueSeasonId: 2,
  draftPosition: 1,
  ownerName,
});

const rosterEntry = (
  membershipId: number,
  playerSeasonId: number,
  name: string,
  position: string,
  realTeam: string,
  startWeek: number,
  endWeek: number | null,
): FantasyRosterEntry => ({
  membershipId,
  playerSeasonId,
  playerId: playerSeasonId,
  name,
  position,
  realTeam,
  rosterSlot: position,
  startWeek,
  endWeek,
});

const points = (
  playerSeasonId: number,
  name: string,
  position: string,
  realTeam: string,
  weekScores: Record<string, number>,
): FantasyPlayerPoints => ({
  playerSeasonId,
  name,
  position,
  realTeam,
  weekScores,
  total: Object.values(weekScores).reduce((sum, score) => sum + score, 0),
});

const pick = (
  pickNumber: number,
  playerSeasonId: number | null,
  playerName: string | null,
  position: string | null,
  realTeam: string | null,
): FantasyDraftPick => ({
  pick: pickNumber,
  playerSeasonId,
  playerName,
  position,
  realTeam,
});

const buildRoutes = (): Record<string, unknown> => ({
  '/seasons': { seasons: [season(63, false), season(64, true)] },
  '/groups?season=64': {
    groups: [group(1, 1, 'Group 1'), group(2, 2, 'IceBear Stinks')],
  },
  '/groups/1/teams': { teams: [team(10, 'Alice', 1), team(11, 'Bob', 1)] },
  '/groups/2/teams': { teams: [team(20, 'Cara', 2)] },
  '/teams/10': {
    rosterHistory: [
      rosterEntry(1, 100, 'Player One', 'QB', 'AAA', 1, null),
      rosterEntry(2, 101, 'Player Two', 'RB', 'BBB', 5, null),
      rosterEntry(3, 102, 'Player Three', 'WR', 'CCC', 1, 4),
    ],
  },
  '/teams/11': {
    rosterHistory: [rosterEntry(4, 103, 'Player Four', 'K', 'DDD', 1, null)],
  },
  '/teams/20': {
    rosterHistory: [rosterEntry(5, 104, 'Player Five', 'LB', 'EEE', 1, null)],
  },
  '/groups/1/draft': {
    picks: [
      pick(1, 100, 'Player One', 'QB', 'AAA'),
      pick(2, 101, 'Player Two', 'RB', 'BBB'),
      pick(3, null, 'Imported Guy', 'WR', 'CCC'),
    ],
  },
  '/groups/2/draft': {
    picks: [
      pick(1, 100, 'Player One', 'QB', 'AAA'),
      pick(4, 101, 'Player Two', 'RB', 'BBB'),
      pick(5, null, null, null, null),
    ],
  },
  '/players/points?season=64': {
    players: [
      points(100, 'Player One', 'QB', 'AAA', { '1': 10, '2': 5, '5': 7 }),
      points(101, 'Player Two', 'RB', 'BBB', { '1': 100, '5': 3, '6': 4 }),
      points(102, 'Player Three', 'WR', 'CCC', { '1': 2, '4': 8, '5': 50 }),
      points(103, 'Player Four', 'K', 'DDD', { '1': 20 }),
      points(104, 'Player Five', 'LB', 'EEE', { '1': 30 }),
    ],
  },
});

describe('FantasyApiClient', () => {
  let client: FantasyApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    const routes = buildRoutes();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      const path = url.replace('https://mock-fantasy.test', '');
      return Promise.resolve({
        ok: path in routes,
        status: path in routes ? 200 : 404,
        json: async () => routes[path],
      });
    });
    client = new FantasyApiClient();
  });

  it('loads the current season and its data', async () => {
    await client.reload();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock-fantasy.test/seasons',
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock-fantasy.test/groups?season=64',
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock-fantasy.test/players/points?season=64',
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      'https://mock-fantasy.test/groups?season=63',
    );
  });

  it('maps player season totals', async () => {
    const players = await client.getPlayers();

    expect(players).toHaveLength(5);
    expect(players.find((player) => player.name === 'Player One')).toEqual({
      name: 'Player One',
      position: 'QB',
      team: 'AAA',
      score: 22,
    });
  });

  it('counts only weeks each player spent on the team', async () => {
    const users = await client.getUsers();

    expect(users.find((user) => user.username === 'Alice')).toEqual({
      username: 'Alice',
      group: 1,
      groupName: 'Group 1',
      score: 39,
      rank: 1,
      overall: 1,
    });
    expect(users.find((user) => user.username === 'Cara')).toMatchObject({
      group: 2,
      groupName: 'IceBear Stinks',
      score: 30,
      rank: 1,
      overall: 2,
    });
    expect(users.find((user) => user.username === 'Bob')).toMatchObject({
      score: 20,
      rank: 2,
      overall: 3,
    });
  });

  it('maps roster stints with weeks and stint scores', async () => {
    const roster = await client.getRosteredPlayers();

    expect(roster.find((player) => player.name === 'Player Two')).toEqual({
      username: 'Alice',
      group: 1,
      rosterPosition: 'RB',
      name: 'Player Two',
      position: 'RB',
      team: 'BBB',
      start: 5,
      end: undefined,
      score: 7,
    });
    expect(roster.find((player) => player.name === 'Player Three')).toMatchObject(
      { start: 1, end: 4, score: 10 },
    );
  });

  it('aggregates ADP across every group draft', async () => {
    const adp = await client.getAdpPlayers();

    expect(adp.find((player) => player.player === 'Player One')).toEqual({
      player: 'Player One',
      team: 'AAA',
      position: 'QB',
      adp: 1,
      median: 1,
      count: 2,
    });
    expect(adp.find((player) => player.player === 'Player Two')).toEqual({
      player: 'Player Two',
      team: 'BBB',
      position: 'RB',
      adp: 3,
      median: 3,
      count: 2,
    });
    expect(adp.find((player) => player.player === 'Imported Guy')).toMatchObject(
      { adp: 3, median: 3, count: 1 },
    );
    expect(adp).toHaveLength(3);
  });

  it('shares one in-flight load between concurrent getters', async () => {
    await Promise.all([client.getUsers(), client.getPlayers()]);

    const seasonCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]) => url === 'https://mock-fantasy.test/seasons',
    );
    expect(seasonCalls).toHaveLength(1);
  });

  it('reuses the snapshot between getter calls', async () => {
    await client.getUsers();
    const fetchCalls = (global.fetch as jest.Mock).mock.calls.length;

    await client.getPlayers();

    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCalls);
  });

  it('serves the cached snapshot when a refresh fails', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    await client.getUsers();

    now.mockReturnValue(6 * 60 * 1000);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    await expect(client.getUsers()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ username: 'Alice', score: 39 }),
      ]),
    );
    now.mockRestore();
  });

  it('throws when the first load fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    await expect(client.getPlayers()).rejects.toThrow('network down');
  });
});
