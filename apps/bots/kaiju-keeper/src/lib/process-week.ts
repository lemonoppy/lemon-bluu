import { PortalClient } from 'src/db/PortalClient';
import {
  fetchAllSeasonGameData,
  validateGameDataStructure
} from 'src/lib/dataPipelineDataFetcher';
import {
  getSeasonGameData
} from 'src/lib/dataPipelineUtils';
import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';

// Helper function to determine season state
const getSeasonState = (season: number, week: number): string => {
  let regularWeeks: number;
  
  if (season <= 15) {
    regularWeeks = 14;
  } else if (season <= 22) {
    regularWeeks = 13;
  } else {
    regularWeeks = 16;
  }
  
  if (season === 2) {
    regularWeeks = 15;
  }
  
  if (week === 0) {
    return "PlayoffBye";
  } else if (week > regularWeeks) {
    return "PostSeason";
  } else if (week < 1) {
    return "PreSeason";
  } else {
    return "RegularSeason";
  }
};

// Helper function to calculate passer rating
const calculatePasserRating = (cmp: number, att: number, yds: number, td: number, int: number): number => {
  if (att === 0) return 0;
  
  const a = Math.max(0, Math.min(2.375, (cmp / att - 0.3) * 5));
  const b = Math.max(0, Math.min(2.375, (yds / att - 3) * 0.25));
  const c = Math.max(0, Math.min(2.375, (td / att) * 20));
  const d = Math.max(0, Math.min(2.375, 2.375 - (int / att * 25)));
  
  return (a + b + c + d) / 6 * 100;
};

// Helper function to clean player names
const cleanPlayerName = (name: string): string => {
  return name
    .replace(/\s*\(.*?\)\s*/g, '') // Remove anything in parentheses
    .trim();
};

// Interface for unified player stats
export interface UnifiedPlayerStat {
  pid: number;
  playerName: string;
  gid: string;
  season: number;
  week: number;
  team: string;
  position: string | null;
  seasonstate: string;
  
  // Passing
  passcmp: number;
  passatt: number;
  passyds: number;
  passavg: number;
  passtd: number;
  passint: number;
  passrat: number;
  passsacked: number | null;
  passsackedyards: number | null;
  
  // Rushing  
  rushatt: number;
  rushyds: number;
  rushavg: number;
  rushtd: number;
  rushlg: number;
  
  // Receiving
  recrec: number;
  recyds: number;
  recavg: number;
  rectd: number;
  rectar: number;
  reclg: number;
  
  // Kicking
  kxpm: number;
  kxpa: number;
  kfgmu20: number;
  kfgau20: number;
  kfgm2029: number;
  kfga2029: number;
  kfgm3039: number;
  kfga3039: number;
  kfgm4049: number;
  kfga4049: number;
  kfgm50: number;
  kfga50: number;
  
  // Punting
  ppunts: number;
  pyds: number;
  pavg: number;
  plng: number;
  pinside20: number;
  
  // Defense
  deftck: number;
  deftfl: number;
  defsack: number;
  defpd: number;
  defint: number;
  defsfty: number;
  deftd: number;
  defff: number;
  deffr: number;
  defblkp: number;
  defblkxp: number;
  defblkfg: number;
  
  // Special Teams
  stkr: number;
  stkryds: number;
  stkrtd: number;
  stkrlng: number;
  stpr: number;
  stpryds: number;
  stprtd: number;
  stprlng: number;
  
  // Other
  otherpancakes: number;
  othersacksallowed: number;
  otherpenalties: number;
  otherpenyards: number;
}

// Fetch player ID mapping from PortalClient (simId -> pid)
const getPlayerIdMapping = async (): Promise<{ [simId: number]: number }> => {
  try {
    const players = await PortalClient.getAllPlayers();
    const mapping: { [simId: number]: number } = {};
    
    players.forEach(player => {
      if (player.simId && player.pid) {
        mapping[player.simId] = player.pid;
      }
    });
    
    logger.info(`Found ${Object.keys(mapping).length} player ID mappings from PortalClient`);
    return mapping;
  } catch (error) {
    logger.error('Error in getPlayerIdMapping from PortalClient:', error);
    return {};
  }
};

// Main processing function
const processPlayerStats = (
  boxScoreData: any[],
  playerData: any[],
  weekMap: { [gameId: string]: number },
  season: number,
  targetWeek: number,
  playerIdMapping: { [simId: number]: number }
): UnifiedPlayerStat[] => {
  const allPlayerStats: UnifiedPlayerStat[] = [];
  const unmappedPlayers: Array<{simId: number, name: string, team: string}> = [];

  // Category mappings from box score data
  const statCategories = [
    'Passing', 'Rushing', 'Receiving', 'Kicking', 'Punting', 'Def', 'ST', 'Other'
  ];
  
  for (const box of boxScoreData) {
    const gameId = String(box.id); // Convert to string to match weekMap keys
    
    // Python logic: check if gameID exists in idDict.keys()
    if (!(gameId in weekMap)) {
      continue;
    }

    const week = weekMap[gameId];
    
    // Only process games from the target week
    if (week !== targetWeek) continue;
    
    // Skip preseason games (week 0 or negative) - this includes playoff bye weeks
    if (week <= 0) continue;
    
    // Process each stat category for both home and away teams
    for (const category of statCategories) {
      const homeStats = box[`hStats${category}`] || [];
      const awayStats = box[`aStats${category}`] || [];
      
      // Process home team players
      for (const playerStat of homeStats) {
        if (!playerStat.id || !playerStat.name) continue;
        
        const cleanName = cleanPlayerName(playerStat.name);
        if (cleanName.includes('BOT')) continue; // Skip bot players
        
        const player = playerData.find(p => p.id === playerStat.id);
        
        // Get the database player ID from the mapping - skip if not found
        const databasePid = playerIdMapping[playerStat.id];
        if (!databasePid) {
          // Track unmapped players for summary report
          const existingUnmapped = unmappedPlayers.find(p => p.simId === playerStat.id);
          if (!existingUnmapped) {
            unmappedPlayers.push({
              simId: playerStat.id,
              name: cleanName,
              team: box.hAbb
            });
          }
          continue;
        }
        
        const existingStatIndex = allPlayerStats.findIndex(
          s => s.pid === databasePid && s.gid === gameId
        );
        
        let playerStatRecord: UnifiedPlayerStat;
        
        if (existingStatIndex >= 0) {
          playerStatRecord = allPlayerStats[existingStatIndex];
        } else {
          playerStatRecord = createEmptyPlayerStat(
            databasePid,
            cleanName,
            gameId,
            season,
            week,
            box.hAbb,
            player?.pos || null
          );
          allPlayerStats.push(playerStatRecord);
        }
        
        // Map stats based on category
        mapStatsToRecord(playerStatRecord, playerStat, category);
      }
      
      // Process away team players
      for (const playerStat of awayStats) {
        if (!playerStat.id || !playerStat.name) continue;
        
        const cleanName = cleanPlayerName(playerStat.name);
        if (cleanName.includes('BOT')) continue; // Skip bot players
        
        const player = playerData.find(p => p.id === playerStat.id);
        
        // Get the database player ID from the mapping - skip if not found
        const databasePid = playerIdMapping[playerStat.id];
        if (!databasePid) {
          // Track unmapped players for summary report
          const existingUnmapped = unmappedPlayers.find(p => p.simId === playerStat.id);
          if (!existingUnmapped) {
            unmappedPlayers.push({
              simId: playerStat.id,
              name: cleanName,
              team: box.aAbb
            });
          }
          continue;
        }
        
        const existingStatIndex = allPlayerStats.findIndex(
          s => s.pid === databasePid && s.gid === gameId
        );
        
        let playerStatRecord: UnifiedPlayerStat;
        
        if (existingStatIndex >= 0) {
          playerStatRecord = allPlayerStats[existingStatIndex];
        } else {
          playerStatRecord = createEmptyPlayerStat(
            databasePid,
            cleanName,
            gameId,
            season,
            week,
            box.aAbb,
            player?.pos || null
          );
          allPlayerStats.push(playerStatRecord);
        }

        // Map stats based on category
        mapStatsToRecord(playerStatRecord, playerStat, category);
      }
    }
  }

  // Log summary of unmapped players
  if (unmappedPlayers.length > 0) {
    logger.warn(`Found ${unmappedPlayers.length} players without PID mappings:`);
    unmappedPlayers.forEach(player => {
      logger.warn(`  - ${player.name} (${player.team}) [simId: ${player.simId}]`);
    });
    logger.warn('These players were skipped during processing. Please verify their PID mappings.');
  } else {
    logger.info('All players successfully mapped to PIDs');
  }

  // Calculate derived statistics
  return allPlayerStats.map(calculateDerivedStats);
};

// Create empty player stat record with default values
const createEmptyPlayerStat = (
  pid: number,
  playerName: string,
  gid: string,
  season: number,
  week: number,
  team: string,
  position: string | null
): UnifiedPlayerStat => {
  return {
    pid,
    playerName,
    gid,
    season,
    week,
    team,
    position,
    seasonstate: getSeasonState(season, week),
    
    // Passing
    passcmp: 0, passatt: 0, passyds: 0, passavg: 0, passtd: 0, passint: 0, 
    passrat: 0, passsacked: null, passsackedyards: null,
    
    // Rushing  
    rushatt: 0, rushyds: 0, rushavg: 0, rushtd: 0, rushlg: 0,
    
    // Receiving
    recrec: 0, recyds: 0, recavg: 0, rectd: 0, rectar: 0, reclg: 0,
    
    // Kicking
    kxpm: 0, kxpa: 0, kfgmu20: 0, kfgau20: 0, kfgm2029: 0, kfga2029: 0,
    kfgm3039: 0, kfga3039: 0, kfgm4049: 0, kfga4049: 0, kfgm50: 0, kfga50: 0,
    
    // Punting
    ppunts: 0, pyds: 0, pavg: 0, plng: 0, pinside20: 0,
    
    // Defense
    deftck: 0, deftfl: 0, defsack: 0, defpd: 0, defint: 0, defsfty: 0,
    deftd: 0, defff: 0, deffr: 0, defblkp: 0, defblkxp: 0, defblkfg: 0,
    
    // Special Teams
    stkr: 0, stkryds: 0, stkrtd: 0, stkrlng: 0,
    stpr: 0, stpryds: 0, stprtd: 0, stprlng: 0,
    
    // Other
    otherpancakes: 0, othersacksallowed: 0, otherpenalties: 0, otherpenyards: 0
  };
};

// Map raw stats to player record based on category
const mapStatsToRecord = (record: UnifiedPlayerStat, rawStat: any, category: string) => {
  switch (category) {
    case 'Passing':
      record.passcmp = rawStat.c || 0;
      record.passatt = rawStat.a || 0;
      record.passyds = rawStat.y || 0;
      record.passtd = rawStat.td || 0;
      record.passint = rawStat.i || 0;
      record.passsacked = rawStat.sacked || null;
      record.passsackedyards = rawStat.sackedyards || null;
      break;
      
    case 'Rushing':
      record.rushatt = rawStat.a || 0;
      record.rushyds = rawStat.y || 0;
      record.rushtd = rawStat.td || 0;
      record.rushlg = rawStat.l || 0;
      break;
      
    case 'Receiving':
      record.recrec = rawStat.c || 0;
      record.recyds = rawStat.y || 0;
      record.rectd = rawStat.td || 0;
      record.rectar = rawStat.tar || 0;
      record.reclg = rawStat.l || 0;
      break;
      
    case 'Kicking':
      record.kxpm = rawStat.xpm || 0;
      record.kxpa = rawStat.xpa || 0;
      record.kfgmu20 = rawStat.fgm_u20 || 0;
      record.kfgau20 = rawStat.fga_u20 || 0;
      record.kfgm2029 = rawStat.fgm_2029 || 0;
      record.kfga2029 = rawStat.fga_2029 || 0;
      record.kfgm3039 = rawStat.fgm_3039 || 0;
      record.kfga3039 = rawStat.fga_3039 || 0;
      record.kfgm4049 = rawStat.fgm_4049 || 0;
      record.kfga4049 = rawStat.fga_4049 || 0;
      record.kfgm50 = rawStat.fgm_50 || 0;
      record.kfga50 = rawStat.fga_50 || 0;
      break;
      
    case 'Punting':
      record.ppunts = rawStat.p || 0;
      record.pyds = rawStat.y || 0;
      record.plng = rawStat.l || 0;
      record.pinside20 = rawStat.i || 0;
      break;
      
    case 'Def':
      record.deftck = rawStat.t || 0;
      record.deftfl = rawStat.tfl || 0;
      record.defsack = rawStat.s || 0;
      record.defpd = rawStat.pd || 0;
      record.defint = rawStat.i || 0;
      record.defff = rawStat.ff || 0;
      record.deffr = rawStat.fr || 0;
      record.defsfty = rawStat.sf || 0;
      record.deftd = rawStat.td || 0;
      record.defblkp = rawStat.bp || 0;
      record.defblkfg = rawStat.bfg || 0;
      record.defblkxp = rawStat.bxp || 0;
      break;
      
    case 'ST':
      record.stkr = rawStat.kr || 0;
      record.stkryds = rawStat.kry || 0;
      record.stkrlng = rawStat.krl || 0;
      record.stkrtd = rawStat.krt || 0;
      record.stpr = rawStat.pr || 0;
      record.stpryds = rawStat.pry || 0;
      record.stprlng = rawStat.prl || 0;
      record.stprtd = rawStat.prt || 0;
      break;
      
    case 'Other':
      record.otherpancakes = rawStat.pan || 0;
      record.othersacksallowed = rawStat.sacks || 0;
      record.otherpenalties = rawStat.pen || 0;
      record.otherpenyards = rawStat.y || 0;
      break;
  }
};

// Calculate derived statistics (averages, percentages, etc.)
const calculateDerivedStats = (record: UnifiedPlayerStat): UnifiedPlayerStat => {
  // Passing averages and rating
  if (record.passatt > 0) {
    record.passavg = Number((record.passyds / record.passatt).toFixed(2));
    record.passrat = Number(calculatePasserRating(
      record.passcmp, record.passatt, record.passyds, record.passtd, record.passint
    ).toFixed(2));
  }
  
  // Rushing average
  if (record.rushatt > 0) {
    record.rushavg = Number((record.rushyds / record.rushatt).toFixed(2));
  }
  
  // Receiving average
  if (record.recrec > 0) {
    record.recavg = Number((record.recyds / record.recrec).toFixed(2));
  }
  
  // Punting average
  if (record.ppunts > 0) {
    record.pavg = Number((record.pyds / record.ppunts).toFixed(2));
  }
  
  return record;
};

// Save unified player stats to database
export const saveUnifiedPlayerStats = async (playerStats: UnifiedPlayerStat[]): Promise<{ insertedCount: number; errorCount: number; errors: string[] }> => {
  let insertedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const batchSize = 100; // Insert 100 records at a time

  for (let i = 0; i < playerStats.length; i += batchSize) {
    const batch = playerStats.slice(i, i + batchSize);
    
    try {
      // Build batch insert query
      const valuesClauses: string[] = [];
      const allValues: any[] = [];
      
      batch.forEach((stat, index) => {
        const baseIndex = index * 70; // 70 columns total
        const placeholders = Array.from({length: 70}, (_, i) => `$${baseIndex + i + 1}`).join(', ');
        valuesClauses.push(`(${placeholders})`);
        
        allValues.push(
          stat.pid, stat.gid, stat.season, stat.week, stat.team, stat.position, stat.seasonstate,
          stat.passcmp, stat.passatt, stat.passyds, stat.passavg, stat.passtd, stat.passint, stat.passrat, stat.passsacked, stat.passsackedyards,
          stat.rushatt, stat.rushyds, stat.rushavg, stat.rushtd, stat.rushlg,
          stat.recrec, stat.recyds, stat.recavg, stat.rectd, stat.rectar, stat.reclg,
          stat.kxpm, stat.kxpa, stat.kfgmu20, stat.kfgau20, stat.kfgm2029, stat.kfga2029, stat.kfgm3039, stat.kfga3039, stat.kfgm4049, stat.kfga4049, stat.kfgm50, stat.kfga50,
          stat.ppunts, stat.pyds, stat.pavg, stat.plng, stat.pinside20,
          stat.deftck, stat.deftfl, stat.defsack, stat.defpd, stat.defint, stat.defsfty, stat.deftd, stat.defff, stat.deffr, stat.defblkp, stat.defblkxp, stat.defblkfg,
          stat.stkr, stat.stkryds, stat.stkrtd, stat.stkrlng, stat.stpr, stat.stpryds, stat.stprtd, stat.stprlng,
          stat.otherpancakes, stat.othersacksallowed, stat.otherpenalties, stat.otherpenyards,
          new Date(), new Date()
        );
      });

      const batchQuery = `
        INSERT INTO player_stats 
        (pid, gid, season, week, team, position, seasonstate,
         passcmp, passatt, passyds, passavg, passtd, passint, passrat, passsacked, passsackedyards,
         rushatt, rushyds, rushavg, rushtd, rushlg,
         recrec, recyds, recavg, rectd, rectar, reclg,
         kxpm, kxpa, kfgmu20, kfgau20, kfgm2029, kfga2029, kfgm3039, kfga3039, kfgm4049, kfga4049, kfgm50, kfga50,
         ppunts, pyds, pavg, plng, pinside20,
         deftck, deftfl, defsack, defpd, defint, defsfty, deftd, defff, deffr, defblkp, defblkxp, defblkfg,
         stkr, stkryds, stkrtd, stkrlng, stpr, stpryds, stprtd, stprlng,
         otherpancakes, othersacksallowed, otherpenalties, otherpenyards,
         createdat, updatedat)
        VALUES ${valuesClauses.join(', ')}
        ON CONFLICT (pid, gid, season, week) DO UPDATE SET
          team = EXCLUDED.team,
          position = EXCLUDED.position,
          seasonstate = EXCLUDED.seasonstate,
          passcmp = EXCLUDED.passcmp,
          passatt = EXCLUDED.passatt,
          passyds = EXCLUDED.passyds,
          passavg = EXCLUDED.passavg,
          passtd = EXCLUDED.passtd,
          passint = EXCLUDED.passint,
          passrat = EXCLUDED.passrat,
          passsacked = EXCLUDED.passsacked,
          passsackedyards = EXCLUDED.passsackedyards,
          rushatt = EXCLUDED.rushatt,
          rushyds = EXCLUDED.rushyds,
          rushavg = EXCLUDED.rushavg,
          rushtd = EXCLUDED.rushtd,
          rushlg = EXCLUDED.rushlg,
          recrec = EXCLUDED.recrec,
          recyds = EXCLUDED.recyds,
          recavg = EXCLUDED.recavg,
          rectd = EXCLUDED.rectd,
          rectar = EXCLUDED.rectar,
          reclg = EXCLUDED.reclg,
          kxpm = EXCLUDED.kxpm,
          kxpa = EXCLUDED.kxpa,
          kfgmu20 = EXCLUDED.kfgmu20,
          kfgau20 = EXCLUDED.kfgau20,
          kfgm2029 = EXCLUDED.kfgm2029,
          kfga2029 = EXCLUDED.kfga2029,
          kfgm3039 = EXCLUDED.kfgm3039,
          kfga3039 = EXCLUDED.kfga3039,
          kfgm4049 = EXCLUDED.kfgm4049,
          kfga4049 = EXCLUDED.kfga4049,
          kfgm50 = EXCLUDED.kfgm50,
          kfga50 = EXCLUDED.kfga50,
          ppunts = EXCLUDED.ppunts,
          pyds = EXCLUDED.pyds,
          pavg = EXCLUDED.pavg,
          plng = EXCLUDED.plng,
          pinside20 = EXCLUDED.pinside20,
          deftck = EXCLUDED.deftck,
          deftfl = EXCLUDED.deftfl,
          defsack = EXCLUDED.defsack,
          defpd = EXCLUDED.defpd,
          defint = EXCLUDED.defint,
          defsfty = EXCLUDED.defsfty,
          deftd = EXCLUDED.deftd,
          defff = EXCLUDED.defff,
          deffr = EXCLUDED.deffr,
          defblkp = EXCLUDED.defblkp,
          defblkxp = EXCLUDED.defblkxp,
          defblkfg = EXCLUDED.defblkfg,
          stkr = EXCLUDED.stkr,
          stkryds = EXCLUDED.stkryds,
          stkrtd = EXCLUDED.stkrtd,
          stkrlng = EXCLUDED.stkrlng,
          stpr = EXCLUDED.stpr,
          stpryds = EXCLUDED.stpryds,
          stprtd = EXCLUDED.stprtd,
          stprlng = EXCLUDED.stprlng,
          otherpancakes = EXCLUDED.otherpancakes,
          othersacksallowed = EXCLUDED.othersacksallowed,
          otherpenalties = EXCLUDED.otherpenalties,
          otherpenyards = EXCLUDED.otherpenyards,
          updatedat = EXCLUDED.updatedat
      `;

      const result = await Query(batchQuery, allValues);
      
      result.match(
        (queryResult: any) => {
          insertedCount += queryResult.rowCount || 0;
        },
        (error: any) => {
          errorCount += batch.length;
          const detailedError = `Failed to insert batch starting at record ${i + 1}: ${error.message}`;
          logger.error(detailedError);
          logger.error('Sample batch data:', batch[0]);
          logger.error('Query parameters count:', allValues.length);
          logger.error('Expected parameters:', batch.length * 69);
          errors.push(detailedError);
        }
      );
      
    } catch (error) {
      errorCount += batch.length;
      errors.push(`Failed to insert batch starting at record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (errors.length > 5) { // Limit error reporting to first 5 batch errors
        errors.push(`... and ${Math.ceil((playerStats.length - i - batchSize) / batchSize)} more batch errors`);
        break;
      }
    }
  }

  return { insertedCount, errorCount, errors };
};

// Main function to process a week's stats and save to unified table
export const processWeekUnified = async (season: number, week: number): Promise<{
  success: boolean;
  totalRecords: number;
  insertedCount: number;
  errorCount: number;
  errors: string[];
  message: string;
}> => {
  try {
    // Get game IDs and week mappings for the season
    const gameData = await getSeasonGameData(season, true);
    
    if (gameData.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        insertedCount: 0,
        errorCount: 0,
        errors: [`No game data found for season ${season}`],
        message: `No game data found for season ${season}`
      };
    }
    
    // Create week mapping for easy lookup
    const weekMap: { [gameId: string]: number } = {};
    gameData.forEach((game: any) => {
      weekMap[game.id] = game.week;
    });
    
    // Check if the specified week exists in the game data
    const weekExists = gameData.some((game: any) => game.week === week);
    if (!weekExists) {
      return {
        success: false,
        totalRecords: 0,
        insertedCount: 0,
        errorCount: 0,
        errors: [`No games found for season ${season} week ${week}`],
        message: `No games found for season ${season} week ${week}`
      };
    }
    
    // Fetch and decompress all game data for the season
    const fetchedGameData = await fetchAllSeasonGameData(season);
    
    // Validate the fetched data structure
    const validation = validateGameDataStructure(fetchedGameData);
    if (!validation.isValid) {
      return {
        success: false,
        totalRecords: 0,
        insertedCount: 0,
        errorCount: 0,
        errors: validation.errors,
        message: 'Invalid game data structure'
      };
    }
    
    // Fetch player ID mapping from database
    const playerIdMapping = await getPlayerIdMapping();
    
    // Process into player stats
    const playerStats = processPlayerStats(
      fetchedGameData.boxData,
      fetchedGameData.playerData,
      weekMap,
      season,
      week,
      playerIdMapping
    );

    if (!playerStats || playerStats.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        insertedCount: 0,
        errorCount: 0,
        errors: [`No player stats found for season ${season} week ${week}`],
        message: `No player stats found for season ${season} week ${week}`
      };
    }

    // Save to database
    const { insertedCount, errorCount, errors } = await saveUnifiedPlayerStats(playerStats);

    return {
      success: true,
      totalRecords: playerStats.length,
      insertedCount,
      errorCount,
      errors,
      message: `Successfully processed ${insertedCount} player stat records for season ${season} week ${week}`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      totalRecords: 0,
      insertedCount: 0,
      errorCount: 0,
      errors: [errorMessage],
      message: `Error processing season ${season} week ${week}: ${errorMessage}`
    };
  }
};

// Export the processing function for use in Discord bot commands
export { processPlayerStats, getPlayerIdMapping };
