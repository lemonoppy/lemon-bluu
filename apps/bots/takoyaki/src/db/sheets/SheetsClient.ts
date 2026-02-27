import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { google } from 'googleapis';
import { PortalClient } from 'src/db/portal/PortalClient';
import { DynamicConfig } from 'src/lib/config/dynamicConfig';
import { logger } from 'src/lib/logger';
import { CombinePlayer, DraftSeason, DraftUsers } from 'typings/sheets';

// Helper to parse Google service account credentials from environment
const getServiceAccountCredentials = () => {
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS ?? '{}');
};

// Type-specific row parsers
const parseDraftUserAll = (row: string[]): DraftUsers => ({
  season: parseInt(row[0]),
  name: row[1],
  count: parseInt(row[2]),
  firstRounder: !!row[3]
});

const parseDraftUserCurrent = (row: string[], currentSeason: number): DraftUsers => ({
  season: currentSeason,
  name: row[0],
  count: parseInt(row[1]),
});

const parseDraftSeason = (row: string[]): DraftSeason => ({
  season: parseInt(row[0]),
  count: parseInt(row[1]),
});

const parseCombinePlayer = (row: string[]): CombinePlayer => ({
  season: parseInt(row[0]),
  player: row[1],
  position: row[2],
  wonderlic: parseInt(row[3]),
  bench: parseFloat(row[4]),
  vertical: parseFloat(row[5]),
  broad: parseFloat(row[6]),
  shuttle: parseFloat(row[7]),
  threecone: parseFloat(row[8]),
  tensplit: parseFloat(row[9]),
  twentysplit: parseFloat(row[10]),
  fourtysplit: parseFloat(row[11]),
  ras: parseFloat(row[12]),
});

type sheetInfo = {
  sheet: string;
  range: string;
  type: 'all' | 'current' | 'seasons' | 'combine';
}

const SHEET_RANGES: {
  [key: string]: sheetInfo;
} = {
  ALL_DRAFTS: {
    sheet: 'Overall',
    range: 'B2:E',
    type: 'all',
  },
  CURRENT: {
    sheet: 'Overall',
    range: 'J2:K',
    type: 'current',
  },
  SEASONS: {
    sheet: 'Overall',
    range: 'G2:H',
    type: 'seasons',
  },
  COMBINE: {
    sheet: 'Combine',
    range: 'A2:M',
    type: 'combine',
  }
}

class SheetsApiClient {
  #drafts: Array<DraftUsers> = [];

  #loaded = false;
  #lastLoadTimestamp = 0;

  async #getData<T>(
    data: Array<T>,
    reload: boolean = false,
    sheetInfo: sheetInfo,
  ): Promise<T[]> {
    if (data.length > 0 && !reload) {
      return data;
    }
    const currentSeason = DynamicConfig.currentSeason.get();

    const consensusDraftSheetId = '1bvT0eZlQs7Med7ZSJaA27OwDZ_HUuzPlR7bLRuyqRtg';
    const combineSheetId = '1FROVQYJtFr_ScVMk7kTqIliUDbDdhV3VAKcMQzeq9gE';

    let sheetId
    if (
      sheetInfo.type === 'all' ||
      sheetInfo.type === 'current' ||
      sheetInfo.type === 'seasons'
    ) {
      sheetId = consensusDraftSheetId
    } else {
      sheetId = combineSheetId
    }

    const doc = new GoogleSpreadsheet(sheetId, {
      apiKey: process.env.GOOGLE_API_KEY ?? '',
    });

    let sheetResponseData: T[] = [];

    try {
      // Load document properties and worksheets
      await doc.loadInfo();
      const sheet = doc.sheetsByTitle[sheetInfo.sheet];
      const rows = await sheet.getCellsInRange(sheetInfo.range)

      // Process the data using type-specific parsers
      rows.forEach((row: string[]) => {
        if (row[0].length > 0) {
          let parsed: T;
          switch (sheetInfo.type) {
            case 'all':
              parsed = parseDraftUserAll(row) as T;
              break;
            case 'current':
              parsed = parseDraftUserCurrent(row, currentSeason) as T;
              break;
            case 'seasons':
              parsed = parseDraftSeason(row) as T;
              break;
            case 'combine':
              parsed = parseCombinePlayer(row) as T;
              break;
          }
          sheetResponseData.push(parsed);
        }
      });
    } catch (error) {
      logger.error(error);
    }

    return sheetResponseData;
  }

  async getDrafts(
    reload: boolean = false,
  ): Promise<Array<DraftUsers>> {
    this.#drafts = await this.#getData(
      this.#drafts,
      reload,
      SHEET_RANGES.ALL_DRAFTS,
    );
    return this.#drafts;
  }

  async getCurrent(
    reload: boolean = false,
  ): Promise<Array<DraftUsers>> {
    return await this.#getData(
      [],
      reload,
      SHEET_RANGES.CURRENT,
    );
  }

  async getSeasons(
    reload: boolean = false,
  ): Promise<Array<DraftSeason>> {
    return await this.#getData(
      [],
      reload,
      SHEET_RANGES.SEASONS,
    );
  }

  async refreshTPETracker(
    type: 'weekly' | 'daily' | 'dsfl' = 'dsfl'
  ): Promise<void> {
    const scriptId = process.env.GOOGLE_SCRIPT_ID ?? '';

    let functionToRun = '';
    switch (type) {
      case 'weekly':
        functionToRun = 'WeeklyImportTPETracker';
        break;
      case 'daily':
        functionToRun = 'DailyImportTPETracker';
        break;
      case 'dsfl':
        functionToRun = 'DSFLProspects';
        break;
      default:
        throw new Error('Invalid TPE Tracker type');
    }

    try {
      // Initialize JWT authentication
      const serviceAccountCredentials = getServiceAccountCredentials();

      if (!serviceAccountCredentials.client_email || !serviceAccountCredentials.private_key) {
        throw new Error('Invalid service account credentials - missing email or private key');
      }

      logger.info(`Attempting to call Google Apps Script function: ${functionToRun} with service account: ${serviceAccountCredentials.client_email}`);
      logger.info(`Script URL: https://script.google.com/d/${scriptId}/edit`);

      const jwtClient = new JWT({
        email: serviceAccountCredentials.client_email,
        key: serviceAccountCredentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/script.projects',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });

      // Create Google Apps Script API client
      const script = google.script({ version: 'v1', auth: jwtClient });

      logger.info(`Making API call to execute function: ${functionToRun}`);

      // Execute the function
      const response = await script.scripts.run({
        scriptId: scriptId,
        requestBody: {
          function: functionToRun,
          devMode: false,
        },
      });

      logger.info(`API call completed. Response status: ${response.status}`);

      if (response.data.error) {
        logger.error('Google Apps Script execution failed:', {
          error: response.data.error,
          scriptId,
          functionName: functionToRun,
          serviceAccount: serviceAccountCredentials.client_email,
          errorCode: response.data.error.code,
          errorMessage: response.data.error.message,
          errorDetails: response.data.error.details
        });

        if (response.data.error.code === 403) {
          throw new Error(`Permission denied: The service account '${serviceAccountCredentials.client_email}' needs to be granted access to the Google Apps Script project. Please:\n1. Share the script with this email as an Editor\n2. Enable Google Apps Script API in the script settings`);
        }

        if (response.data.error.code === 404) {
          throw new Error(`Script not found: Please verify:\n1. Script exists at: https://script.google.com/d/${scriptId}/edit\n2. Function '${functionToRun}' is defined in the script\n3. Google Apps Script API is enabled in script settings\n4. Function is not in a library or restricted scope`);
        }

        throw new Error(`Script execution failed (${response.data.error.code}): ${response.data.error.message || 'Unknown error'}`);
      }

      logger.info(`Successfully executed ${functionToRun}. Result:`, response.data.response?.result);
      return response.data.response?.result;
    } catch (error: any) {
      // Handle 404 errors specifically for better debugging
      if (error.code === 404) {
        logger.error(`404 Error Details:`, {
          scriptId,
          functionName: functionToRun,
          url: `https://script.google.com/d/${scriptId}/edit`,
          message: 'Script or function not found'
        });
        throw new Error(`Script not found (404): Either the script ID '${scriptId}' is incorrect, the function '${functionToRun}' doesn't exist, or the Google Apps Script API is not enabled. Please verify:\n1. Script exists at: https://script.google.com/d/${scriptId}/edit\n2. Function '${functionToRun}' is defined in the script\n3. Google Apps Script API is enabled in script settings`);
      }

      logger.error('Error calling Google Apps Script function:', error);
      throw error;
    }
  }

  async callSheetFunction(
    scriptId: string,
    functionName: string,
    parameters: any[] = []
  ): Promise<any> {
    try {
      // Initialize JWT authentication
      const serviceAccountCredentials = getServiceAccountCredentials();
      const jwtClient = new JWT({
        email: serviceAccountCredentials.client_email,
        key: serviceAccountCredentials.private_key,
        scopes: ['https://www.googleapis.com/auth/script.projects'],
      });

      // Create Google Apps Script API client
      const script = google.script({ version: 'v1', auth: jwtClient });

      // Execute the function
      const response = await script.scripts.run({
        scriptId: scriptId,
        requestBody: {
          function: functionName,
          parameters: parameters,
          devMode: false,
        },
      });

      if (response.data.error) {
        logger.error('Google Apps Script execution failed:', response.data.error);
        throw new Error(`Script execution failed: ${response.data.error.details?.[0]?.errorMessage || 'Unknown error'}`);
      }

      logger.info(`Successfully executed ${functionName}`);
      return response.data.response?.result;
    } catch (error) {
      logger.error('Error calling Google Apps Script function:', error);
      throw error;
    }
  }

  async callWebAppFunction(
    webAppUrl: string,
    functionName: string,
    parameters: any[] = []
  ): Promise<any> {
    try {
      logger.info(`Calling web app: ${webAppUrl}`);
      logger.info(`Function: ${functionName}, Parameters:`, parameters);

      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: functionName,
          parameters: parameters
        })
      });

      logger.info(`Web app response status: ${response.status}`);
      logger.info(`Web app response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      logger.info(`Raw response:`, responseText.substring(0, 500)); // Log first 500 chars

      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error(`Web app returned HTML instead of JSON. This usually means the doPost function isn't set up correctly or there's an error in the script. Response: ${responseText.substring(0, 200)}...`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Failed to parse response as JSON. Response was: ${responseText.substring(0, 200)}...`);
      }

      if (result.error) {
        throw new Error(`Web app error: ${result.error}`);
      }

      logger.info(`Successfully executed web app function: ${functionName}`);
      return result;
    } catch (error) {
      logger.error('Error calling web app function:', error);
      throw error;
    }
  }

  async refreshTPETrackerViaWebApp(
    type: 'weekly' | 'daily' | 'dsfl' = 'dsfl'
  ): Promise<void> {
    const webAppUrl = `https://script.google.com/macros/s/${process.env.GOOGLE_SCRIPT_ID ?? ''}/exec`;
    const currentSeason = DynamicConfig.currentSeason.get();
    const players = await PortalClient.getActivePlayers();
    const getRecruitSeason = players.sort((a, b) => (a.draftSeason ?? 0) > (b.draftSeason ?? 0) ? -1 : 1)[0]?.draftSeason ?? currentSeason;

    let functionToRun = '';
    let parameters: any[] = [];

    switch (type) {
      case 'weekly':
        functionToRun = 'WeeklyImportTPETracker';
        break;
      case 'daily':
        functionToRun = 'DailyImportTPETracker';
        break;
      case 'dsfl':
        functionToRun = 'DSFLProspects';
        // Use provided season or default to current season from config

        parameters = [getRecruitSeason];
        break;
      default:
        throw new Error('Invalid TPE Tracker type');
    }

    try {
      logger.info(`Calling web app function: ${functionToRun} with parameters:`, parameters);
      const result = await this.callWebAppFunction(webAppUrl, functionToRun, parameters);
      logger.info(`Web app function ${functionToRun} completed successfully:`, result);
    } catch (error) {
      logger.error(`Error calling web app function ${functionToRun}:`, error);
      throw error;
    }
  }

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      await this.getDrafts(true),
    ]);

    this.#lastLoadTimestamp = Date.now();
    this.#loaded = true;
  }

  async reloadIfError() {
    if (
      !this.#loaded ||
      Date.now() - this.#lastLoadTimestamp >= 30 * 60 * 1000 // 12 hours in milliseconds
    ) {
      this.reload();
    }
  }

  async testScriptConnection(scriptId: string): Promise<void> {
    try {
      // Test with a simple function first
      const result = await this.callSheetFunction(scriptId, 'testFunction', []);
      logger.info('Test function call successful:', result);
    } catch (error) {
      logger.error('Test function call failed:', error);

      // Try listing available functions if the script exists
      try {
        const serviceAccountCredentials = getServiceAccountCredentials();
        const jwtClient = new JWT({
          email: serviceAccountCredentials.client_email,
          key: serviceAccountCredentials.private_key,
          scopes: ['https://www.googleapis.com/auth/script.projects'],
        });

        const script = google.script({ version: 'v1', auth: jwtClient });

        // Try to get script info
        const scriptInfo = await script.projects.get({
          scriptId: scriptId
        });

        logger.info('Script exists and is accessible:', {
          title: scriptInfo.data.title,
          createTime: scriptInfo.data.createTime,
          updateTime: scriptInfo.data.updateTime
        });

      } catch (infoError) {
        logger.error('Cannot access script info:', infoError);
      }

      throw error;
    }
  }
}

export const SheetsClient = new SheetsApiClient();
