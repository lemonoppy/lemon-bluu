import { GoogleSpreadsheet } from 'google-spreadsheet';

// Provide a factory so Jest never loads the real module (avoids ESM-only ky dep)
jest.mock('google-spreadsheet', () => ({
  GoogleSpreadsheet: jest.fn(),
}));

// Mock DynamicConfig
jest.mock('src/lib/config/dynamicConfig', () => ({
  DynamicConfig: {
    fantasySheetId: {
      get: () => 'mock-sheet-id',
    },
  },
}));

// Mock logger
jest.mock('src/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Import after mocks
import { FantasyClient } from '../FantasyClient';

describe('FantasyClient', () => {
  let mockLoadInfo: jest.Mock;
  let mockGetCellsInRange: jest.Mock;
  let mockSheetsByTitle: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadInfo = jest.fn();
    mockGetCellsInRange = jest.fn();

    mockSheetsByTitle = {
      'Player Scores': {
        getCellsInRange: mockGetCellsInRange,
      },
      'Users Scores': {
        getCellsInRange: mockGetCellsInRange,
      },
      'Rosters': {
        getCellsInRange: mockGetCellsInRange,
      },
    };

    (GoogleSpreadsheet as unknown as jest.Mock).mockImplementation(() => ({
      loadInfo: mockLoadInfo,
      sheetsByTitle: mockSheetsByTitle,
    }));

    // Set GOOGLE_API_KEY for tests
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  describe('getPlayers', () => {
    it('should fetch and parse players successfully', async () => {
      const mockSheetData = [
        ['Player One', 'C', 'Team A', '', '100.5'],
        ['Player Two', 'LW', 'Team B', '', '95.25'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getPlayers(true);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Player One',
        position: 'C',
        team: 'Team A',
        score: 100.5,
      });
      expect(result[1]).toEqual({
        name: 'Player Two',
        position: 'LW',
        team: 'Team B',
        score: 95.25,
      });
      expect(mockLoadInfo).toHaveBeenCalledTimes(1);
      expect(mockGetCellsInRange).toHaveBeenCalledWith('A4:E');
    });

    it('should skip empty rows', async () => {
      const mockSheetData = [
        ['Player One', 'C', 'Team A', '', '100.5'],
        ['', '', '', '', ''],
        ['Player Two', 'LW', 'Team B', '', '95.25'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getPlayers(true);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Player One');
      expect(result[1].name).toBe('Player Two');
    });

    it('should handle scores with commas', async () => {
      const mockSheetData = [
        ['Player One', 'C', 'Team A', '', '1,234.56'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getPlayers(true);

      expect(result[0].score).toBe(1234.56);
    });

    it('should use cached data when reload is false', async () => {
      const mockSheetData = [
        ['Player One', 'C', 'Team A', '', '100.5'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result1 = await FantasyClient.getPlayers(true);
      const result2 = await FantasyClient.getPlayers(false);

      expect(result1).toEqual(result2);
      expect(mockLoadInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockLoadInfo.mockRejectedValueOnce(new Error('Sheet access error'));

      const result = await FantasyClient.getPlayers(true);

      expect(result).toEqual([]);
    });
  });

  describe('getUsers', () => {
    it('should fetch and parse users successfully', async () => {
      const mockSheetData = [
        ['User1', '1', '500.25', '1', '5'],
        ['User2', 'A', '450.50', '2', '10'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getUsers(true);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        username: 'User1',
        group: 1,
        score: 500.25,
        rank: 1,
        overall: 5,
      });
      expect(result[1]).toEqual({
        username: 'User2',
        group: 'A',
        score: 450.50,
        rank: 2,
        overall: 10,
      });
    });

    it('should handle group as number or string', async () => {
      const mockSheetData = [
        ['User1', '5', '500', '1', '1'],
        ['User2', 'Premier', '450', '2', '2'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getUsers(true);

      expect(result[0].group).toBe(5);
      expect(result[1].group).toBe('Premier');
    });

    it('should handle scores with commas', async () => {
      const mockSheetData = [
        ['User1', '1', '1,234.56', '1', '1'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getUsers(true);

      expect(result[0].score).toBe(1234.56);
    });
  });

  describe('getRosteredPlayers', () => {
    it('should fetch and parse rostered players successfully', async () => {
      const mockSheetData = [
        ['User1', '1', 'C1', 'Player One', 'C', 'Team A', '1', '10', '150.5'],
        ['User2', '2', 'LW1', 'Player Two', 'LW', 'Team B', '5', '', '100.25'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getRosteredPlayers(true);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        username: 'User1',
        group: 1,
        rosterPosition: 'C1',
        name: 'Player One',
        position: 'C',
        team: 'Team A',
        start: 1,
        end: 10,
        score: 150.5,
      });
      expect(result[1]).toEqual({
        username: 'User2',
        group: 2,
        rosterPosition: 'LW1',
        name: 'Player Two',
        position: 'LW',
        team: 'Team B',
        start: 5,
        end: undefined,
        score: 100.25,
      });
    });

    it('should handle group as string', async () => {
      const mockSheetData = [
        ['User1', 'Premier', 'C1', 'Player One', 'C', 'Team A', '1', '10', '150.5'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getRosteredPlayers(true);

      expect(result[0].group).toBe('Premier');
    });

    it('should handle end date as undefined when empty', async () => {
      const mockSheetData = [
        ['User1', '1', 'C1', 'Player One', 'C', 'Team A', '1', '', '150.5'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getRosteredPlayers(true);

      expect(result[0].end).toBeUndefined();
    });

    it('should handle scores with commas', async () => {
      const mockSheetData = [
        ['User1', '1', 'C1', 'Player One', 'C', 'Team A', '1', '10', '1,500.75'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getRosteredPlayers(true);

      expect(result[0].score).toBe(1500.75);
    });
  });

  describe('reload', () => {
    it('should reload all data sources', async () => {
      const mockPlayersData = [['Player', 'C', 'Team', '', '100']];
      const mockUsersData = [['User', '1', '500', '1', '1']];
      const mockRosteredData = [['User', '1', 'C1', 'Player', 'C', 'Team', '1', '10', '100']];

      mockGetCellsInRange
        .mockResolvedValueOnce(mockPlayersData)
        .mockResolvedValueOnce(mockUsersData)
        .mockResolvedValueOnce(mockRosteredData);

      await FantasyClient.reload();

      expect(mockLoadInfo).toHaveBeenCalledTimes(3);
      expect(mockGetCellsInRange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Google Spreadsheet initialization', () => {
    it('should initialize with correct sheet ID and API key', async () => {
      process.env.GOOGLE_API_KEY = 'test-key-456';

      const mockSheetData = [['Player', 'C', 'Team', '', '100']];
      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      await FantasyClient.getPlayers(true);

      expect(GoogleSpreadsheet).toHaveBeenCalledWith('mock-sheet-id', {
        apiKey: 'test-key-456',
      });
    });
  });
});
