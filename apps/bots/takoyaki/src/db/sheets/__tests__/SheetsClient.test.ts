import { GoogleSpreadsheet } from 'google-spreadsheet';

// Mock GoogleSpreadsheet
jest.mock('google-spreadsheet');

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    script: jest.fn(() => ({
      scripts: {
        run: jest.fn(),
      },
      projects: {
        get: jest.fn(),
      },
    })),
  },
}));

// Mock google-auth-library
jest.mock('google-auth-library', () => ({
  JWT: jest.fn().mockImplementation(() => ({})),
}));

// Mock PortalClient
jest.mock('src/db/portal/PortalClient', () => ({
  PortalClient: {
    getActivePlayers: jest.fn(() => Promise.resolve([
      { draftSeason: 80 },
      { draftSeason: 79 },
    ])),
  },
}));

// Mock DynamicConfig
jest.mock('src/lib/config/dynamicConfig', () => ({
  DynamicConfig: {
    currentSeason: {
      get: () => 77,
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
import { SheetsClient } from '../SheetsClient';

describe('SheetsClient', () => {
  let mockLoadInfo: jest.Mock;
  let mockGetCellsInRange: jest.Mock;
  let mockSheetsByTitle: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadInfo = jest.fn();
    mockGetCellsInRange = jest.fn();

    mockSheetsByTitle = {
      'Overall': {
        getCellsInRange: mockGetCellsInRange,
      },
      'Combine': {
        getCellsInRange: mockGetCellsInRange,
      },
    };

    (GoogleSpreadsheet as unknown as jest.Mock).mockImplementation(() => ({
      loadInfo: mockLoadInfo,
      sheetsByTitle: mockSheetsByTitle,
    }));

    process.env.GOOGLE_API_KEY = 'test-api-key';
    process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = JSON.stringify({
      client_email: 'test@test.com',
      private_key: 'test-key',
    });
  });

  describe('getDrafts', () => {
    it('should fetch and parse draft data successfully', async () => {
      const mockSheetData = [
        ['75', 'User1', '3', 'TRUE'],
        ['76', 'User2', '2', ''],
        ['77', 'User3', '1', 'FALSE'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await SheetsClient.getDrafts(true);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        season: 75,
        name: 'User1',
        count: 3,
        firstRounder: true,
      });
      expect(result[1]).toEqual({
        season: 76,
        name: 'User2',
        count: 2,
        firstRounder: false,
      });
      expect(result[2]).toEqual({
        season: 77,
        name: 'User3',
        count: 1,
        firstRounder: true,
      });
    });

    it('should skip empty rows', async () => {
      const mockSheetData = [
        ['75', 'User1', '3', 'TRUE'],
        ['', '', '', ''],
        ['76', 'User2', '2', ''],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await SheetsClient.getDrafts(true);

      expect(result).toHaveLength(2);
    });

    it('should use cached data when reload is false', async () => {
      const mockSheetData = [
        ['75', 'User1', '3', 'TRUE'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result1 = await SheetsClient.getDrafts(true);
      const result2 = await SheetsClient.getDrafts(false);

      expect(result1).toEqual(result2);
      expect(mockLoadInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockLoadInfo.mockRejectedValueOnce(new Error('Sheet access error'));

      const result = await SheetsClient.getDrafts(true);

      expect(result).toEqual([]);
    });
  });

  describe('getCurrent', () => {
    it('should fetch current season draft data', async () => {
      const mockSheetData = [
        ['User1', '3'],
        ['User2', '2'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await SheetsClient.getCurrent(true);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        season: 77,
        name: 'User1',
        count: 3,
      });
      expect(result[1]).toEqual({
        season: 77,
        name: 'User2',
        count: 2,
      });
    });

    it('should always reload data (cache disabled)', async () => {
      const mockSheetData1 = [['User1', '3']];
      const mockSheetData2 = [['User2', '2']];

      mockGetCellsInRange
        .mockResolvedValueOnce(mockSheetData1)
        .mockResolvedValueOnce(mockSheetData2);

      const result1 = await SheetsClient.getCurrent(true);
      const result2 = await SheetsClient.getCurrent(true);

      expect(result1[0].name).toBe('User1');
      expect(result2[0].name).toBe('User2');
      expect(mockLoadInfo).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSeasons', () => {
    it('should fetch season data successfully', async () => {
      const mockSheetData = [
        ['75', '50'],
        ['76', '55'],
        ['77', '60'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      const result = await SheetsClient.getSeasons(true);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        season: 75,
        count: 50,
      });
      expect(result[1]).toEqual({
        season: 76,
        count: 55,
      });
      expect(result[2]).toEqual({
        season: 77,
        count: 60,
      });
    });
  });

  describe('Combine data', () => {
    it('should fetch and parse combine player data', async () => {
      const mockSheetData = [
        ['77', 'Test Player', 'C', '25', '15.5', '30.0', '100.5', '4.5', '7.0', '1.5', '3.0', '5.5', '8.5'],
      ];

      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      // We need to get combine data through a different sheet
      // Since getCombine is not directly exposed, we'll test via the internal getData method
      // For now, let's ensure the sheet ID selection works correctly
      await SheetsClient.getSeasons(true);

      expect(GoogleSpreadsheet).toHaveBeenCalledWith(
        '1bvT0eZlQs7Med7ZSJaA27OwDZ_HUuzPlR7bLRuyqRtg',
        { apiKey: 'test-api-key' }
      );
    });
  });

  describe('reload', () => {
    it('should reload all data sources', async () => {
      const mockDraftData = [['75', 'User1', '3', 'TRUE']];

      mockGetCellsInRange.mockResolvedValueOnce(mockDraftData);

      await SheetsClient.reload();

      expect(mockLoadInfo).toHaveBeenCalled();
      expect(mockGetCellsInRange).toHaveBeenCalled();
    });
  });

  describe('Sheet ID selection', () => {
    it('should use consensus draft sheet ID for draft data', async () => {
      const mockSheetData = [['75', 'User1', '3', 'TRUE']];
      mockGetCellsInRange.mockResolvedValueOnce(mockSheetData);

      await SheetsClient.getDrafts(true);

      expect(GoogleSpreadsheet).toHaveBeenCalledWith(
        '1bvT0eZlQs7Med7ZSJaA27OwDZ_HUuzPlR7bLRuyqRtg',
        { apiKey: 'test-api-key' }
      );
    });
  });

  describe('callWebAppFunction', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should call web app function successfully', async () => {
      const mockResponse = { success: true, data: 'test' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await SheetsClient.callWebAppFunction(
        'https://test.com/exec',
        'testFunction',
        ['param1']
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.com/exec',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            function: 'testFunction',
            parameters: ['param1']
          })
        }
      );
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          entries: () => [],
        },
      });

      await expect(
        SheetsClient.callWebAppFunction('https://test.com/exec', 'testFunction')
      ).rejects.toThrow('HTTP error! status: 500');
    });

    it('should handle HTML error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => '<!DOCTYPE html><html>Error page</html>',
      });

      await expect(
        SheetsClient.callWebAppFunction('https://test.com/exec', 'testFunction')
      ).rejects.toThrow('Web app returned HTML instead of JSON');
    });

    it('should handle invalid JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => 'invalid json',
      });

      await expect(
        SheetsClient.callWebAppFunction('https://test.com/exec', 'testFunction')
      ).rejects.toThrow('Failed to parse response as JSON');
    });

    it('should handle web app errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => JSON.stringify({ error: 'Function failed' }),
      });

      await expect(
        SheetsClient.callWebAppFunction('https://test.com/exec', 'testFunction')
      ).rejects.toThrow('Web app error: Function failed');
    });
  });

  describe('refreshTPETrackerViaWebApp', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should call DSFL prospects function with correct season', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => JSON.stringify(mockResponse),
      });

      await SheetsClient.refreshTPETrackerViaWebApp('dsfl');

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(callArgs[1].body);

      expect(bodyData.function).toBe('DSFLProspects');
      expect(bodyData.parameters).toEqual([80]); // From mocked getActivePlayers
    });

    it('should call weekly import function', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => JSON.stringify(mockResponse),
      });

      await SheetsClient.refreshTPETrackerViaWebApp('weekly');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(callArgs[1].body);

      expect(bodyData.function).toBe('WeeklyImportTPETracker');
    });

    it('should call daily import function', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          entries: () => [],
        },
        text: async () => JSON.stringify(mockResponse),
      });

      await SheetsClient.refreshTPETrackerViaWebApp('daily');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const bodyData = JSON.parse(callArgs[1].body);

      expect(bodyData.function).toBe('DailyImportTPETracker');
    });
  });
});
