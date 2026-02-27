import * as fs from 'fs';
import * as path from 'path';

import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { logger } from 'src/lib/logger';
import { UnifiedPlayerStat } from 'src/lib/process-week';


// Get environment variables
const DSFL_SHEET_ID = process.env.DSFL_SHEET_ID || '';
const GOOGLE_SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || '';

// Define all 71 header columns in order
const HEADER_COLUMNS = [
  'PID', 'Player Name', 'Game ID', 'Season', 'Week', 'Team', 'Position', 'Season State',
  // Passing (9)
  'Pass Cmp', 'Pass Att', 'Pass Yds', 'Pass Avg', 'Pass TD', 'Pass Int', 'Pass Rat', 'Sacked', 'Sacked Yds',
  // Rushing (5)
  'Rush Att', 'Rush Yds', 'Rush Avg', 'Rush TD', 'Rush Long',
  // Receiving (6)
  'Rec Rec', 'Rec Yds', 'Rec Avg', 'Rec TD', 'Rec Tar', 'Rec Long',
  // Kicking (12)
  'XP Made', 'XP Att', 'FG <20 M', 'FG <20 A', 'FG 20-29 M', 'FG 20-29 A',
  'FG 30-39 M', 'FG 30-39 A', 'FG 40-49 M', 'FG 40-49 A', 'FG 50+ M', 'FG 50+ A',
  // Punting (5)
  'Punts', 'Punt Yds', 'Punt Avg', 'Punt Long', 'Inside 20',
  // Defense (12)
  'Tackles', 'TFL', 'Sacks', 'PD', 'Int', 'Safety', 'Def TD', 'FF', 'FR',
  'Block Punt', 'Block XP', 'Block FG',
  // Special Teams (8)
  'KR', 'KR Yds', 'KR TD', 'KR Long', 'PR', 'PR Yds', 'PR TD', 'PR Long',
  // Other (4)
  'Pancakes', 'Sacks Allowed', 'Penalties', 'Penalty Yds'
];

/**
 * Convert a UnifiedPlayerStat to a row object for Google Sheets
 */
const statToRow = (stat: UnifiedPlayerStat): any => {
  return {
    'PID': stat.pid,
    'Player Name': stat.playerName,
    'Game ID': stat.gid,
    'Season': stat.season,
    'Week': stat.week,
    'Team': stat.team,
    'Position': stat.position || '',
    'Season State': stat.seasonstate,

    // Passing
    'Pass Cmp': stat.passcmp,
    'Pass Att': stat.passatt,
    'Pass Yds': stat.passyds,
    'Pass Avg': stat.passavg,
    'Pass TD': stat.passtd,
    'Pass Int': stat.passint,
    'Pass Rat': stat.passrat,
    'Sacked': stat.passsacked !== null ? stat.passsacked : 0,
    'Sacked Yds': stat.passsackedyards !== null ? stat.passsackedyards : 0,

    // Rushing
    'Rush Att': stat.rushatt,
    'Rush Yds': stat.rushyds,
    'Rush Avg': stat.rushavg,
    'Rush TD': stat.rushtd,
    'Rush Long': stat.rushlg,

    // Receiving
    'Rec Rec': stat.recrec,
    'Rec Yds': stat.recyds,
    'Rec Avg': stat.recavg,
    'Rec TD': stat.rectd,
    'Rec Tar': stat.rectar,
    'Rec Long': stat.reclg,

    // Kicking
    'XP Made': stat.kxpm,
    'XP Att': stat.kxpa,
    'FG <20 M': stat.kfgmu20,
    'FG <20 A': stat.kfgau20,
    'FG 20-29 M': stat.kfgm2029,
    'FG 20-29 A': stat.kfga2029,
    'FG 30-39 M': stat.kfgm3039,
    'FG 30-39 A': stat.kfga3039,
    'FG 40-49 M': stat.kfgm4049,
    'FG 40-49 A': stat.kfga4049,
    'FG 50+ M': stat.kfgm50,
    'FG 50+ A': stat.kfga50,

    // Punting
    'Punts': stat.ppunts,
    'Punt Yds': stat.pyds,
    'Punt Avg': stat.pavg,
    'Punt Long': stat.plng,
    'Inside 20': stat.pinside20,

    // Defense
    'Tackles': stat.deftck,
    'TFL': stat.deftfl,
    'Sacks': stat.defsack,
    'PD': stat.defpd,
    'Int': stat.defint,
    'Safety': stat.defsfty,
    'Def TD': stat.deftd,
    'FF': stat.defff,
    'FR': stat.deffr,
    'Block Punt': stat.defblkp,
    'Block XP': stat.defblkxp,
    'Block FG': stat.defblkfg,

    // Special Teams
    'KR': stat.stkr,
    'KR Yds': stat.stkryds,
    'KR TD': stat.stkrtd,
    'KR Long': stat.stkrlng,
    'PR': stat.stpr,
    'PR Yds': stat.stpryds,
    'PR TD': stat.stprtd,
    'PR Long': stat.stprlng,

    // Other
    'Pancakes': stat.otherpancakes,
    'Sacks Allowed': stat.othersacksallowed,
    'Penalties': stat.otherpenalties,
    'Penalty Yds': stat.otherpenyards
  };
};

/**
 * Export unified player stats to Google Sheets by appending to the season tab
 * Creates "S58" sheet if it doesn't exist, otherwise appends new data to the end
 */
export const exportToGoogleSheets = async (
  stats: UnifiedPlayerStat[]
): Promise<{ success: boolean; exportedCount: number; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Validate environment variables
    if (!GOOGLE_SERVICE_ACCOUNT_PATH) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH not configured in environment. Please set it in your .env file.');
    }

    if (!DSFL_SHEET_ID) {
      throw new Error('DSFL_SHEET_ID not configured in environment. Please set it in your .env file.');
    }

    // Load service account credentials
    const serviceAccountPath = path.resolve(GOOGLE_SERVICE_ACCOUNT_PATH);
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account file not found at: ${serviceAccountPath}`);
    }

    const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    logger.info('Initializing Google Sheets connection with service account...');

    // Create JWT auth client
    const serviceAccountAuth = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize Google Spreadsheet with service account authentication
    const doc = new GoogleSpreadsheet(DSFL_SHEET_ID, serviceAccountAuth);

    await doc.loadInfo();
    logger.info(`Connected to spreadsheet: ${doc.title}`);

    // Use a single sheet for the season
    const sheetTitle = 'S58';
    let sheet = doc.sheetsByTitle[sheetTitle];

    // Create sheet if it doesn't exist, otherwise append to it
    if (!sheet) {
      logger.info(`Creating new sheet: ${sheetTitle}`);
      sheet = await doc.addSheet({
        title: sheetTitle,
        gridProperties: {
          rowCount: 1000,
          columnCount: 71
        }
      });
      await sheet.setHeaderRow(HEADER_COLUMNS);
    } else {
      logger.info(`Appending to existing sheet: ${sheetTitle} (current rows: ${sheet.rowCount})`);

      // Resize sheet to accommodate 71 columns if needed
      if (sheet.columnCount < 71) {
        logger.info(`Resizing sheet to 71 columns (current: ${sheet.columnCount})`);
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: 71 });
      }

      // Don't clear - we're appending new week's data to the end
    }

    // Convert stats to row objects
    logger.info(`Converting ${stats.length} player stats to rows...`);
    const rows = stats.map(statToRow);

    // Add rows in batches of 1000 to avoid hitting API limits
    const batchSize = 1000;
    let totalExported = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(rows.length / batchSize);

      logger.info(`Exporting batch ${batchNumber}/${totalBatches} (${batch.length} rows)...`);

      try {
        await sheet.addRows(batch);
        totalExported += batch.length;
        logger.info(`Batch ${batchNumber} exported successfully`);

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMsg = `Failed to export batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(errorMsg);
        errors.push(errorMsg);

        // If it's a quota error, try waiting longer
        if (error instanceof Error && error.message.toLowerCase().includes('quota')) {
          logger.warn('Rate limit detected, waiting 5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          try {
            await sheet.addRows(batch);
            totalExported += batch.length;
            logger.info(`Batch ${batchNumber} exported successfully after retry`);
            errors.pop(); // Remove the error since retry succeeded
          } catch (retryError) {
            logger.error(`Retry failed for batch ${batchNumber}:`, retryError);
            // Keep the original error in the errors array
          }
        }
      }
    }

    logger.info(`Export complete: ${totalExported}/${rows.length} rows exported`);

    return {
      success: totalExported > 0,
      exportedCount: totalExported,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Google Sheets export failed:', error);
    errors.push(errorMsg);

    return {
      success: false,
      exportedCount: 0,
      errors
    };
  }
};
