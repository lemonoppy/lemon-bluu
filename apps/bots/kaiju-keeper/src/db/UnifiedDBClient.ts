import { PortalClient } from 'src/db/PortalClient';
import Query from 'src/lib/db';
import { dbError, notFoundError } from 'src/lib/errors';
import { logger } from 'src/lib/logger';
import { normalizeTeamAbbreviation } from 'src/lib/unifiedTableManager';
import { AppError, DatabaseError } from 'typings/errors.typings';
import {
  UnifiedDefenseStatsWithPlayer,
  UnifiedKickingStatsWithPlayer,
  UnifiedOtherStatsWithPlayer,
  UnifiedPassingStatsWithPlayer,
  UnifiedPuntingStatsWithPlayer,
  UnifiedReceivingStatsWithPlayer,
  UnifiedRushingStatsWithPlayer,
  UnifiedSpecialTeamsStatsWithPlayer
} from 'typings/unified-db.typings';

type PortalData = {
  playersMap: Map<number, any>;
  activePlayerIds: number[];
  activePlayerIdsSet: Set<number>;
};

class UnifiedDBClient {
  constructor() {
  }

  /**
   * Fetch and prepare portal data for a team once.
   * Pass the result to stat methods to avoid redundant portal fetches.
   */
  async getPortalData(teamAbbr: string): Promise<PortalData> {
    const allPlayers = await PortalClient.getAllPlayers();
    const normalizedTeam = normalizeTeamAbbreviation(teamAbbr);

    const playersMap = new Map<number, any>();
    const activePlayerIds: number[] = [];

    allPlayers.forEach(player => {
      if (player.pid) {
        playersMap.set(player.pid, player);
        if (player.status === 'active' && player.isflTeam?.toUpperCase() === normalizedTeam) {
          activePlayerIds.push(player.pid);
        }
      }
    });

    logger.debug(`UnifiedDBClient: Loaded ${allPlayers.length} players, ${activePlayerIds.length} active on ${normalizedTeam}`);

    return { playersMap, activePlayerIds, activePlayerIdsSet: new Set(activePlayerIds) };
  }

  /**
   * Generic method to get stats with proper team filtering using portal data
   */
  async #getStatsWithTeamFilter<T>(
    tableName: string,
    tableAlias: string,
    teamAbbr: string,
    season?: number,
    week?: number,
    orderBy: string = `${tableAlias}.rushyds DESC`,
    activeOnly: boolean = false,
    portalData?: PortalData
  ): Promise<T[] | AppError> {

    const { playersMap, activePlayerIds, activePlayerIdsSet } =
      portalData ?? await this.getPortalData(teamAbbr);

    const conditions = [`${tableAlias}.team = $1`];
    const params: string[] = [normalizeTeamAbbreviation(teamAbbr)];

    if (activeOnly && activePlayerIds.length > 0) {
      conditions.push(`${tableAlias}.pid = ANY($${params.length + 1})`);
      params.push(`{${activePlayerIds.join(',')}}`);
    }

    if (season) {
      conditions.push(`${tableAlias}.season = $${params.length + 1}`);
      params.push(season.toString());
    }

    if (week) {
      conditions.push(`${tableAlias}.week = $${params.length + 1}`);
      params.push(week.toString());
    }

    const query = `
      SELECT ${tableAlias}.*
      FROM ${tableName} ${tableAlias}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
    `;

    const result = await Query(query, params);

    return result.match(
      (queryResult) => {
        if (queryResult.rowCount === 0) {
          return notFoundError(`${tableName} Stats`);
        }

        const unmappedPids = new Set<number>();
        const enrichedRows = queryResult.rows.map((row: any) => {
          const player = playersMap.get(row.pid);

          if (!player) {
            unmappedPids.add(row.pid);
          }

          return {
            ...row,
            player_name: player?.username || `Player ${row.pid}`,
            firstname: player?.firstName || '',
            lastname: player?.lastName || '',
            position: player?.position || '',
            status: player?.status || 'active',
            onteam: activePlayerIdsSet.has(row.pid)
          };
        });

        if (unmappedPids.size > 0) {
          logger.warn(`UnifiedDBClient: No portal data for PIDs: ${[...unmappedPids].join(', ')} — likely retired/historical players`);
        }

        return enrichedRows as T[];
      },
      (error): DatabaseError =>
        dbError(`Failed to fetch ${tableName} stats: ${error.message}`, 'DB_ERROR')
    );
  }

  async getPassingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedPassingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ps', teamAbbr, season, week, 'ps.passyds DESC, ps.passtd DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        completions: row.passcmp,
        attempts: row.passatt,
        completionpct: row.passatt > 0 ? (row.passcmp / row.passatt * 100) : 0,
        yards: row.passyds,
        ypa: row.passavg,
        td: row.passtd,
        int: row.passint,
        rating: row.passrat,
        sacks: row.passsacked || 0,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getRushingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedRushingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'rs', teamAbbr, season, week, 'rs.rushyds DESC, rs.rushtd DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        attempts: row.rushatt,
        yards: row.rushyds,
        ypc: row.rushavg,
        long: row.rushlg,
        td: row.rushtd,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getReceivingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedReceivingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'rs', teamAbbr, season, week, 'rs.recyds DESC, rs.rectd DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        receptions: row.recrec,
        targets: row.rectar,
        yards: row.recyds,
        ypr: row.recavg,
        long: row.reclg,
        td: row.rectd,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getDefenseStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedDefenseStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ds', teamAbbr, season, week, 'ds.deftck DESC, ds.defsack DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        tck: row.deftck,
        tfl: row.deftfl,
        sack: row.defsack,
        ff: row.defff,
        fr: row.deffr,
        pd: row.defpd,
        int: row.defint,
        sfty: row.defsfty,
        td: row.deftd,
        blkp: row.defblkp,
        blkxp: row.defblkxp,
        blkfg: row.defblkfg,
        negativeplays: (row.defsack || 0) + (row.deftfl || 0),
        turnovers: (row.defint || 0) + (row.deffr || 0),
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getKickingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedKickingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ks', teamAbbr, season, week, '(ks.kxpm + ks.kfgmu20 + ks.kfgm2029 + ks.kfgm3039 + ks.kfgm4049 + ks.kfgm50) DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        xpmade: row.kxpm,
        xpatt: row.kxpa,
        fgunder20made: row.kfgmu20,
        fgunder20att: row.kfgau20,
        fg20_29made: row.kfgm2029,
        fg20_29att: row.kfga2029,
        fg30_39made: row.kfgm3039,
        fg30_39att: row.kfga3039,
        fg40_49made: row.kfgm4049,
        fg40_49att: row.kfga4049,
        fg50plusmade: row.kfgm50,
        fg50plusatt: row.kfga50,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getPuntingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedPuntingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ps', teamAbbr, season, week, 'ps.pavg DESC, ps.ppunts DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        punts: row.ppunts,
        yds: row.pyds,
        avg: row.pavg,
        lng: row.plng,
        inside20: row.pinside20,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getOtherStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedOtherStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'os', teamAbbr, season, week, 'os.otherpancakes DESC, os.otherpenalties ASC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        penalties: row.otherpenalties,
        yards: row.otherpenyards,
        pancakes: row.otherpancakes,
        sacksallowed: row.othersacksallowed,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }

  async getSpecialTeamsStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false, portalData?: PortalData): Promise<UnifiedSpecialTeamsStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'st', teamAbbr, season, week, 'st.stkryds DESC, st.stpryds DESC', activeOnly, portalData
    );

    if (Array.isArray(result)) {
      return result.map(row => ({
        id: row.pid,
        season: row.season,
        week: row.week,
        pid: row.pid,
        team: row.team,
        created_at: new Date(),
        kr: row.stkr,
        kryds: row.stkryds,
        krtd: row.stkrtd,
        krlng: row.stkrlng,
        pr: row.stpr,
        pryds: row.stpryds,
        prtd: row.stprtd,
        prlng: row.stprlng,
        player_name: row.player_name,
        firstname: row.firstname,
        lastname: row.lastname,
        position: row.position,
        onteam: row.onteam,
        status: row.status
      }));
    }
    return result;
  }
}

export const UnifiedDatabaseClient = new UnifiedDBClient();
