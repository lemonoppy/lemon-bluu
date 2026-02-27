import type { BankAccountHeaderData, BasicUserInfo, ManagerInfo, Player } from 'typings/portal';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the Config
jest.mock('src/lib/config/config', () => ({
  Config: {
    portalApiUrl: 'https://mock-api.com',
  },
}));

// Mock the DynamicConfig
jest.mock('src/lib/config/dynamicConfig', () => ({
  DynamicConfig: {
    currentSeason: {
      get: () => 77,
      set: () => {},
    },
  },
}));

// Mock the logger
jest.mock('src/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Import after mocks
import { PortalClient } from '../PortalClient';

describe('PortalClient', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const mockUserInfo: BasicUserInfo[] = [
        { uid: 1, username: 'testuser1' },
        { uid: 2, username: 'testuser2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await PortalClient.getUserInfo();

      expect(result).toEqual(mockUserInfo);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/userinfo?',
      );
    });

    it('should reload data when reload is true', async () => {
      const mockUserInfo: BasicUserInfo[] = [
        { uid: 3, username: 'testuser3' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await PortalClient.getUserInfo(true);
      expect(result).toContainEqual({ uid: 3, username: 'testuser3' });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(PortalClient.getUserInfo(true)).rejects.toThrow(
        'HTTP 500: Internal Server Error',
      );
    });
  });

  describe('getActivePlayers', () => {
    it('should fetch active players successfully', async () => {
      const mockPlayers: Partial<Player>[] = [
        {
          pid: 1,
          firstName: 'Player',
          lastName: 'One',
          position: 'Quarterback',
        },
        {
          pid: 2,
          firstName: 'Player',
          lastName: 'Two',
          position: 'Wide Receiver',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers,
      });

      const result = await PortalClient.getActivePlayers();

      expect(result).toEqual(mockPlayers);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/player?status=active',
      );
    });

    it('should reload active players when requested', async () => {
      const mockPlayers: Partial<Player>[] = [
        { pid: 3, firstName: 'Reload', lastName: 'Test' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers,
      });

      const result = await PortalClient.getActivePlayers(true);

      expect(result).toContainEqual({ pid: 3, firstName: 'Reload', lastName: 'Test' });
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getPlayer', () => {
    it('should fetch a specific player successfully', async () => {
      const mockPlayer: Partial<Player> = {
        pid: 123,
        firstName: 'Test',
        lastName: 'Player',
        position: 'Quarterback',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPlayer],
      });

      const result = await PortalClient.getPlayer('123');

      expect(result).toEqual(mockPlayer);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/player?pid=123',
      );
    });

    it('should return undefined when player is not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await PortalClient.getPlayer('999');

      expect(result).toBeUndefined();
    });
  });

  describe('getTPEEvents', () => {
    it('should fetch TPE events for a user', async () => {
      const mockTPEEvents = {
        uid: '123',
        events: [
          { date: '2024-01-01', tpe: 5, description: 'Activity Check' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTPEEvents,
      });

      const result = await PortalClient.getTPEEvents('123');

      expect(result).toEqual(mockTPEEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/ia-tracker?uid=123',
      );
    });
  });

  describe('getHeaderInfo', () => {
    it('should fetch bank header info successfully', async () => {
      const mockHeaderInfo: Partial<BankAccountHeaderData>[] = [
        {
          uid: 1,
          username: 'testuser',
          bankBalance: 1000,
          avatar: 'avatar.png',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHeaderInfo,
      });

      const result = await PortalClient.getHeaderInfo();

      expect(result).toEqual(mockHeaderInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/bank/header-info?',
      );
    });
  });

  describe('getCurrentSeason', () => {
    it('should fetch and update current season', async () => {
      const mockSeason = { season: 78 };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSeason,
      });

      const result = await PortalClient.getCurrentSeason(true);

      // getCurrentSeason returns the value from DynamicConfig which we mocked to always return 77
      expect(result).toBe(77);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getGeneralManagers', () => {
    it('should fetch general managers successfully', async () => {
      const mockManagers: Partial<ManagerInfo>[] = [
        {
          uid: 1,
          username: 'GM1',
          team: 'Team A',
          id: 1,
          league: 'ISFL',
          createdDate: '2024-01-01',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManagers,
      });

      const result = await PortalClient.getGeneralManagers(true);

      expect(result).toEqual(mockManagers);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-api.com/manager?',
      );
    });
  });

  describe('reload', () => {
    it('should reload all data sources', async () => {
      const mockUserInfo: BasicUserInfo[] = [{ uid: 1, username: 'test' }];
      const mockPlayers: Partial<Player>[] = [];
      const mockSeason = { season: 78 };
      const mockHeaderInfo: Partial<BankAccountHeaderData>[] = [];
      const mockManagers: Partial<ManagerInfo>[] = [];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockUserInfo })
        .mockResolvedValueOnce({ ok: true, json: async () => mockPlayers })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSeason })
        .mockResolvedValueOnce({ ok: true, json: async () => mockHeaderInfo })
        .mockResolvedValueOnce({ ok: true, json: async () => mockManagers });

      await PortalClient.reload();

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });
});
