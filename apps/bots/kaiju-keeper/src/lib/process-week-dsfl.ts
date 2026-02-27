import { PortalClient } from 'src/db/PortalClient';
import {
  fetchAllSeasonGameDataDSFL,
  validateGameDataStructure
} from 'src/lib/dataPipelineDataFetcher-dsfl';
import {
  getSeasonGameDataDSFL
} from 'src/lib/dataPipelineUtils-dsfl';
import { exportToGoogleSheets } from 'src/lib/googleSheetsExporter';
import { logger } from 'src/lib/logger';
import { processPlayerStats } from 'src/lib/process-week';

/**
 * Filter player ID mapping to include only DSFL players
 */
const filterDSFLPlayers = async (): Promise<{ [simId: number]: number }> => {
  try {
    const allPlayers = await PortalClient.getAllPlayers();
    const mapping: { [simId: number]: number } = {};

    allPlayers.forEach(player => {
      // Filter for players in DSFL league
      if (player.currentLeague === 'DSFL' && player.simId && player.pid) {
        mapping[player.simId] = player.pid;
      }
    });

    logger.info(`Found ${Object.keys(mapping).length} DSFL players with PID mappings`);
    return mapping;
  } catch (error) {
    logger.error('Error filtering DSFL players:', error);
    return {};
  }
};

/**
 * Main function to process DSFL stats for a specific week and export to Google Sheets
 */
export const processWeeksDSFL = async (targetWeek: number): Promise<{
  success: boolean;
  totalRecords: number;
  exportedCount: number;
  errors: string[];
  message: string;
}> => {
  try {
    logger.info(`Starting DSFL S58 processing for week ${targetWeek}`);

    // Step 1: Fetch DSFL schedule
    logger.info('Fetching DSFL schedule...');
    const gameData = await getSeasonGameDataDSFL(true);

    if (gameData.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: ['No DSFL game data found for Season 58'],
        message: 'No DSFL game data found for Season 58'
      };
    }

    logger.info(`Found ${gameData.length} games in DSFL S58`);

    // Create week mapping for easy lookup
    const weekMap: { [gameId: string]: number } = {};
    gameData.forEach((game: any) => {
      weekMap[game.id] = game.week;
    });

    // Validate requested week exists
    const maxWeek = Math.max(...gameData.map((game: any) => game.week));
    if (targetWeek > maxWeek) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: [`Week ${targetWeek} not found. DSFL Season 58 has ${maxWeek} weeks available.`],
        message: `Week ${targetWeek} exceeds available weeks (max: ${maxWeek})`
      };
    }

    // Step 2: Fetch and decompress all game data for the season
    logger.info('Fetching and decompressing DSFL game data files...');
    const fetchedGameData = await fetchAllSeasonGameDataDSFL();

    // Validate the fetched data structure
    const validation = validateGameDataStructure(fetchedGameData);
    if (!validation.isValid) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: validation.errors,
        message: 'Invalid DSFL game data structure'
      };
    }

    logger.info(`Loaded ${fetchedGameData.boxData.length} box scores and ${fetchedGameData.playerData.length} player records`);

    // Step 3: Get DSFL player ID mappings
    logger.info('Fetching DSFL player mappings from Portal...');
    const dsflPlayerMapping = await filterDSFLPlayers();

    if (Object.keys(dsflPlayerMapping).length === 0) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: ['No DSFL players found in Portal. Check currentLeague field.'],
        message: 'No DSFL players found'
      };
    }

    // Step 4: Process stats for the specified week only
    logger.info(`Processing week ${targetWeek}...`);

    // Check if the week exists in the game data
    const weekExists = gameData.some((game: any) => game.week === targetWeek);
    if (!weekExists) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: [`Week ${targetWeek} not found in game data`],
        message: `Week ${targetWeek} not found`
      };
    }

    const weekStats = processPlayerStats(
      fetchedGameData.boxData,
      fetchedGameData.playerData,
      weekMap,
      58, // DSFL Season 58
      targetWeek,
      dsflPlayerMapping
    );

    if (!weekStats || weekStats.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        exportedCount: 0,
        errors: [`No player stats found for DSFL S58 week ${targetWeek}`],
        message: 'No player stats found'
      };
    }

    logger.info(`Week ${targetWeek} complete: ${weekStats.length} player records`);

    // Step 5: Export to Google Sheets
    logger.info('Exporting to Google Sheets...');
    const exportResult = await exportToGoogleSheets(weekStats);

    if (!exportResult.success) {
      return {
        success: false,
        totalRecords: weekStats.length,
        exportedCount: exportResult.exportedCount,
        errors: exportResult.errors,
        message: 'Failed to export to Google Sheets'
      };
    }

    return {
      success: true,
      totalRecords: weekStats.length,
      exportedCount: exportResult.exportedCount,
      errors: exportResult.errors,
      message: `Successfully processed and exported ${exportResult.exportedCount} player stat records for DSFL S58 W${targetWeek}`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('DSFL processing failed:', error);
    return {
      success: false,
      totalRecords: 0,
      exportedCount: 0,
      errors: [errorMessage],
      message: `Error processing DSFL S58 week ${targetWeek}: ${errorMessage}`
    };
  }
};
