let GoogleSpreadsheet: jest.Mock;
let loadGoogleSpreadsheetMock: jest.Mock;

// Mock the loader used by FantasyClient for google-spreadsheet
jest.mock('src/lib/googleSpreadsheetLoader', () => ({
  loadGoogleSpreadsheet: jest.fn(),
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
    const googleSpreadsheetModule = require('src/lib/googleSpreadsheetLoader');
    loadGoogleSpreadsheetMock =
      googleSpreadsheetModule.loadGoogleSpreadsheet as jest.Mock;
    GoogleSpreadsheet = jest.fn();
    loadGoogleSpreadsheetMock.mockResolvedValue({
      GoogleSpreadsheet,
    });

    mockLoadInfo = jest.fn();
    mockGetCellsInRange = jest.fn();

    mockSheetsByTitle = {
      FantasyADP: {
        getCellsInRange: mockGetCellsInRange,
      },
      'Player Scores': {
        getCellsInRange: mockGetCellsInRange,
      },
      'Users Scores': {
        getCellsInRange: mockGetCellsInRange,
      },
      Rosters: {
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

  describe('getAdpPlayers', () => {
    it('should fetch and parse ADP players successfully', async () => {
      const mockSheetData = [
        ['Player', 'Team', 'Position', 'ADP', 'Median', 'Count'],
        ['Player One', 'Team A', 'RB', '1.25', '1', '1,234'],
        ['Player Two', 'Team B', 'WR', '2.50', '2.5', '10'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getAdpPlayers(true);

      expect(result).toEqual([
        {
          player: 'Player One',
          team: 'Team A',
          position: 'RB',
          adp: 1.25,
          median: 1,
          count: 1234,
        },
        {
          player: 'Player Two',
          team: 'Team B',
          position: 'WR',
          adp: 2.5,
          median: 2.5,
          count: 10,
        },
      ]);
      expect(mockGetCellsInRange).toHaveBeenCalledWith('O4:T');
      expect(GoogleSpreadsheet).toHaveBeenCalledWith(
        '1UjWlGattioFkZeVr7dZqxBX74MueMJCmUAt_1InAwFg',
        { apiKey: 'test-api-key' },
      );
    });

    it('should skip empty rows, the header, and invalid numeric data', async () => {
      const mockSheetData = [
        ['Player', 'Team', 'Position', 'ADP', 'Median', 'Count'],
        ['', '', '', '', '', ''],
        ['Invalid Player', 'Team A', 'RB', 'N/A', '1', '2'],
        ['Valid Player', 'Team B', 'WR', '3', '3', '4'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getAdpPlayers(true);

      expect(result).toHaveLength(1);
      expect(result[0].player).toBe('Valid Player');
    });

    it('should use cached ADP data when reload is false', async () => {
      mockGetCellsInRange.mockResolvedValueOnce([
        ['Player One', 'Team A', 'RB', '1.25', '1', '5'],
      ]);

      const result1 = await FantasyClient.getAdpPlayers(true);
      const result2 = await FantasyClient.getAdpPlayers(false);

      expect(result1).toEqual(result2);
      expect(mockLoadInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle ADP sheet errors gracefully', async () => {
      mockLoadInfo.mockRejectedValueOnce(new Error('Sheet access error'));

      const result = await FantasyClient.getAdpPlayers(true);

      expect(result).toEqual([]);
    });
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
      const mockSheetData = [['Player One', 'C', 'Team A', '', '1,234.56']];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getPlayers(true);

      expect(result[0].score).toBe(1234.56);
    });

    it('should use cached data when reload is false', async () => {
      const mockSheetData = [['Player One', 'C', 'Team A', '', '100.5']];

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
        score: 450.5,
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
      const mockSheetData = [['User1', '1', '1,234.56', '1', '1']];

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
        [
          'User1',
          'Premier',
          'C1',
          'Player One',
          'C',
          'Team A',
          '1',
          '10',
          '150.5',
        ],
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
        [
          'User1',
          '1',
          'C1',
          'Player One',
          'C',
          'Team A',
          '1',
          '10',
          '1,500.75',
        ],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await FantasyClient.getRosteredPlayers(true);

      expect(result[0].score).toBe(1500.75);
    });
  });

  describe('reload', () => {
    it('should reload all data sources', async () => {
      const mockAdpData = [['Player', 'Team', 'RB', '1', '1', '1']];
      const mockPlayersData = [['Player', 'C', 'Team', '', '100']];
      const mockUsersData = [['User', '1', '500', '1', '1']];
      const mockRosteredData = [
        ['User', '1', 'C1', 'Player', 'C', 'Team', '1', '10', '100'],
      ];

      mockGetCellsInRange
        .mockResolvedValueOnce(mockAdpData)
        .mockResolvedValueOnce(mockPlayersData)
        .mockResolvedValueOnce(mockUsersData)
        .mockResolvedValueOnce(mockRosteredData);

      await FantasyClient.reload();

      expect(mockLoadInfo).toHaveBeenCalledTimes(4);
      expect(mockGetCellsInRange).toHaveBeenCalledTimes(4);
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
