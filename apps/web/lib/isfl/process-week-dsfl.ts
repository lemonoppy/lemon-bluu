
import {
  fetchAllSeasonGameDataDSFL,
  validateGameDataStructure,
} from 'src/lib/dataPipelineDataFetcher-dsfl';
import { getSeasonGameDataDSFL } from 'src/lib/dataPipelineUtils-dsfl';
import { processPlayerStats } from 'src/lib/process-week';

import { portalFetch } from '@/lib/isfl/portal';
import type { Player, PlayerStats } from '@/lib/isfl/types';

export interface DSFLWeeklyStatsRow extends PlayerStats {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

export const processDSFLWeeklyStats = async (
  season: number,
  week: number,
): Promise<DSFLWeeklyStatsRow[]> => {
  if (!Number.isInteger(season) || season <= 0) {
    throw new Error('Season must be a positive integer');
  }

  if (!Number.isInteger(week) || week <= 0) {
    throw new Error('Week must be a positive integer');
  }

  const [gameData, portalPlayers] = await Promise.all([
    getSeasonGameDataDSFL(season, true),
    portalFetch<Player[]>('player'),
  ]);

  if (gameData.length === 0) {
    throw new Error(`No DSFL game data found for season ${season}`);
  }

  const weekMap: Record<string, number> = {};
  gameData.forEach((game) => {
    weekMap[game.id] = game.week;
  });

  const maxWeek = Math.max(...gameData.map((game) => game.week));
  if (week > maxWeek) {
    throw new Error(
      `Week ${week} exceeds the available weeks for DSFL S${season} (max: ${maxWeek})`,
    );
  }

  const fetchedGameData = await fetchAllSeasonGameDataDSFL(season);
  const validation = validateGameDataStructure(fetchedGameData);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  const dsflPlayerMapping = portalPlayers.reduce<Record<number, number>>(
    (mapping, player) => {
      if (player.currentLeague === 'DSFL' && player.simId && player.pid) {
        mapping[player.simId] = player.pid;
      }
      return mapping;
    },
    {},
  );

  if (Object.keys(dsflPlayerMapping).length === 0) {
    throw new Error('No DSFL players were found in the Portal data');
  }

  const weekStats = processPlayerStats(
    fetchedGameData.boxData,
    fetchedGameData.playerData,
    weekMap,
    season,
    week,
    dsflPlayerMapping,
  );

  if (!weekStats.length) {
    throw new Error(`No player stats found for DSFL S${season} week ${week}`);
  }

  return weekStats.map((row) => {
    const player = portalPlayers.find((candidate) => candidate.pid === row.pid);

    return {
      firstName: player?.firstName ?? null,
      lastName: player?.lastName ?? null,
      username: player?.username ?? null,
      ...row,
    } as DSFLWeeklyStatsRow;
  });
};
