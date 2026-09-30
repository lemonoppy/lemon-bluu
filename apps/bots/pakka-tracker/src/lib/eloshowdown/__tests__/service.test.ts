import { okAsync } from 'neverthrow';

import Query from 'src/lib/db';

import { EloShowdownApiError, fetchEloHistory, lookupPlayer } from '../client';
import { hydrateRegistrants } from '../service';

jest.mock('src/lib/db', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../client', () => {
  class MockEloShowdownApiError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
    ) {
      super(message);
    }
  }

  class MockBudgetExceededError extends Error {}

  return {
    BudgetExceededError: MockBudgetExceededError,
    EloShowdownApiError: MockEloShowdownApiError,
    fetchEloHistory: jest.fn(),
    fetchPlayer: jest.fn(),
    getRequestCount: jest.fn(() => 2),
    lookupPlayer: jest.fn(),
    resetRequestCount: jest.fn(),
  };
});

const queryMock = Query as jest.Mock;
const lookupPlayerMock = lookupPlayer as jest.MockedFunction<
  typeof lookupPlayer
>;
const fetchEloHistoryMock = fetchEloHistory as jest.MockedFunction<
  typeof fetchEloHistory
>;

const player = {
  id: 123,
  display_name: 'New Player',
  riftbound_id: '456',
  is_anonymous: false,
  primary_community: null,
  primary_community_slug: null,
  country: null,
  lifetime_total_matches: 1,
  lifetime_wins: 1,
  lifetime_losses: 0,
  lifetime_draws: 0,
};

describe('hydrateRegistrants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryMock.mockImplementation(() =>
      okAsync({ rows: [], rowCount: 0 } as never),
    );
    lookupPlayerMock.mockResolvedValue(player);
  });

  it('maps a registrant and stores their current elo', async () => {
    fetchEloHistoryMock.mockResolvedValue({
      season_slug: 'all',
      points: [
        {
          date: '2026-09-01T00:00:00Z',
          elo_before: 1000,
          elo_after: 1018,
          elo_change: 18,
          match_id: 1,
          opponent_id: 789,
          opponent_name: 'Opponent',
          result: 'win',
        },
      ],
    });

    const result = await hydrateRegistrants([
      { riftboundId: 456, username: 'New Player' },
      { riftboundId: 456, username: 'New Player' },
    ]);

    expect(result).toEqual({
      refreshed: 1,
      unresolved: 0,
      requestsUsed: 2,
      stoppedEarly: false,
    });
    expect(lookupPlayerMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('SET current_elo = $2'),
      [123, 1018],
    );
  });

  it('leaves a registrant unresolved when no elo history exists', async () => {
    fetchEloHistoryMock.mockResolvedValue({
      season_slug: 'all',
      points: [],
    });

    const result = await hydrateRegistrants([
      { riftboundId: 456, username: 'New Player' },
    ]);

    expect(result.unresolved).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(result.stoppedEarly).toBe(false);
  });

  it('stops cleanly when EloShowdown rate limits the lookup', async () => {
    lookupPlayerMock.mockRejectedValue(
      new EloShowdownApiError('Rate limited', 429),
    );

    const result = await hydrateRegistrants([
      { riftboundId: 456, username: 'New Player' },
    ]);

    expect(result.stoppedEarly).toBe(true);
    expect(result.refreshed).toBe(0);
  });
});
