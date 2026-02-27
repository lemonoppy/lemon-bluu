import { PortalClient } from 'src/db/PortalClient';
import Query from 'src/lib/db';
import { dbError, notFoundError } from 'src/lib/errors';
import { logger } from 'src/lib/logger';
import { normalizeTeamAbbreviation } from 'src/lib/unifiedTableManager';
import { AppError, DatabaseError } from 'typings/errors.typings';
import {
  UnifiedDefenseStatsWithPlayer,
  UnifiedGameStats,
  UnifiedKickingStatsWithPlayer,
  UnifiedOtherStatsWithPlayer,
  UnifiedPassingStatsWithPlayer,
  UnifiedPlayer,
  UnifiedPuntingStatsWithPlayer,
  UnifiedReceivingStatsWithPlayer,
  UnifiedRushingStatsWithPlayer,
  UnifiedSpecialTeamsStatsWithPlayer
} from 'typings/unified-db.typings';

class UnifiedDBClient {
  constructor() {
  }


  /**
   * Get active player PIDs for a team from the portal
   */
  async #getActiveTeamPlayerIds(teamAbbr: string): Promise<number[]> {
    try {
      const players = await PortalClient.getPlayers();
      const normalizedTeam = normalizeTeamAbbreviation(teamAbbr);
      
      return players
        .filter(player => 
          player.status === 'active' && 
          player.isflTeam === normalizedTeam
        )
        .map(player => player.pid);
    } catch (error) {
      logger.error('Failed to get active team players:', error);
      return [];
    }
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
    activeOnly: boolean = false
  ): Promise<T[] | AppError> {

    // Get ALL players from PortalClient for name mapping (not just active ones)
    // This is important for franchise leaderboards that include retired/inactive players
    const allPlayers = await PortalClient.getAllPlayers();
    const playersMap = new Map<number, any>();
    allPlayers.forEach(player => {
      if (player.pid) {
        playersMap.set(player.pid, player);
      }
    });
    
    logger.debug(`UnifiedDBClient: Loaded ${allPlayers.length} players from PortalClient, mapped ${playersMap.size} with PIDs`);

    // Get active players for this team from portal for onteam flag logic
    const activePlayerIds = await this.#getActiveTeamPlayerIds(teamAbbr);
    const activePlayerIdsSet = new Set(activePlayerIds);
    
    const conditions = [`${tableAlias}.team = $1`];
    const params: string[] = [normalizeTeamAbbreviation(teamAbbr)];

    // If activeOnly is true, only include currently active players
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

    // Simple query without joins - we'll add player info from PortalClient
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
        
        // Merge stats with player info from PortalClient
        const enrichedRows = queryResult.rows.map((row: any) => {
          const player = playersMap.get(row.pid);
          
          if (!player) {
            logger.warn(`UnifiedDBClient: No player data found for PID ${row.pid}`);
          }
          
          return {
            ...row,
            player_name: player?.username || `Player ${row.pid}`,
            firstname: player?.firstName || '',
            lastname: player?.lastName || '',
            position: player?.position || '',
            status: player?.status || 'active',
            // onteam logic: indicates if player is CURRENTLY on this team
            // This should always be based on current active status, regardless of activeOnly
            // activeOnly controls which players are included in results, onteam shows current status
            onteam: activePlayerIdsSet.has(row.pid)
          };
        });
        
        return enrichedRows as T[];
      },
      (error): DatabaseError =>
        dbError(`Failed to fetch ${tableName} stats: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get all players, optionally filtered by team and season
   */
  async getPlayers(teamAbbr?: string, season?: number): Promise<UnifiedPlayer[] | AppError> {

    let query = 'SELECT DISTINCT p.* FROM players p';
    const params: string[] = [];
    const conditions: string[] = [];

    if (teamAbbr || season) {
      query += ' JOIN player_games pg ON p.id = pg.pid';
      
      if (teamAbbr) {
        conditions.push(`pg.team = $${params.length + 1}`);
        params.push(normalizeTeamAbbreviation(teamAbbr));
      }
      
      if (season) {
        conditions.push(`pg.season = $${params.length + 1}`);
        params.push(season.toString());
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY p.name';

    const result = await Query<UnifiedPlayer>(query, params.length > 0 ? params : undefined);

    return result.match(
      (queryResult) => {
        if (queryResult.rowCount === 0) {
          return notFoundError('Players');
        }
        return queryResult.rows;
      },
      (error): DatabaseError =>
        dbError(`Failed to fetch players: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get passing stats with player info, filtered by team and optionally by season
   */
  async getPassingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedPassingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ps', teamAbbr, season, week, 'ps.passyds DESC, ps.passtd DESC', activeOnly
    );
    
    if (Array.isArray(result)) {
      // Map to expected format
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

  /**
   * Get rushing stats with player info, filtered by team and optionally by season
   */
  async getRushingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedRushingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'rs', teamAbbr, season, week, 'rs.rushyds DESC, rs.rushtd DESC', activeOnly
    );
    
    if (Array.isArray(result)) {
      // Map to expected format
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

  /**
   * Get receiving stats with player info, filtered by team and optionally by season
   */
  async getReceivingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedReceivingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'rs', teamAbbr, season, week, 'rs.recyds DESC, rs.rectd DESC', activeOnly
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

  /**
   * Get defense stats with player info, filtered by team and optionally by season
   */
  async getDefenseStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedDefenseStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ds', teamAbbr, season, week, 'ds.deftck DESC, ds.defsack DESC', activeOnly
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

  /**
   * Get kicking stats with player info, filtered by team and optionally by season
   */
  async getKickingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedKickingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ks', teamAbbr, season, week, '(ks.kxpm + ks.kfgmu20 + ks.kfgm2029 + ks.kfgm3039 + ks.kfgm4049 + ks.kfgm50) DESC', activeOnly
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

  /**
   * Get punting stats with player info, filtered by team and optionally by season
   */
  async getPuntingStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedPuntingStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'ps', teamAbbr, season, week, 'ps.pavg DESC, ps.ppunts DESC', activeOnly
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

  /**
   * Get other stats with player info, filtered by team and optionally by season
   */
  async getOtherStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedOtherStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'os', teamAbbr, season, week, 'os.otherpancakes DESC, os.otherpenalties ASC', activeOnly
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

  /**
   * Get special teams stats with player info, filtered by team and optionally by season
   */
  async getSpecialTeamsStats(teamAbbr: string, season?: number, week?: number, activeOnly: boolean = false): Promise<UnifiedSpecialTeamsStatsWithPlayer[] | AppError> {
    const result = await this.#getStatsWithTeamFilter<any>(
      'player_stats', 'st', teamAbbr, season, week, 'st.stkryds DESC, st.stpryds DESC', activeOnly
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

  /**
   * Get game stats for a team, optionally filtered by season and week
   */
  async getGameStats(teamAbbr: string, season?: number, week?: number): Promise<UnifiedGameStats[] | AppError> {

    const conditions = ['team = $1'];
    const params = [normalizeTeamAbbreviation(teamAbbr)];

    if (season) {
      conditions.push(`season = $${params.length + 1}`);
      params.push(season.toString());
    }

    if (week) {
      conditions.push(`week = $${params.length + 1}`);
      params.push(week.toString());
    }

    const query = `
      SELECT * FROM games
      WHERE ${conditions.join(' AND ')}
      ORDER BY season DESC, week DESC
    `;

    const result = await Query<UnifiedGameStats>(query, params);

    return result.match(
      (queryResult) => {
        if (queryResult.rowCount === 0) {
          return notFoundError('Game Stats');
        }
        return queryResult.rows;
      },
      (error): DatabaseError =>
        dbError(`Failed to fetch game stats: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Create or update a player in the unified system
   */
   
  async createOrUpdatePlayer(name: string, _teamAbbr?: string, _season?: number): Promise<number | AppError> {
    const normalizedName = name ? name.replace(/[.]/g, '').trim() : '';
    if (!normalizedName || normalizedName === '{{sname}}') {
      return dbError('Invalid player name', 'VALIDATION_ERROR');
    }


    // Check if player exists
    const existingPlayerResult = await Query<{ id: number }>(
      'SELECT id FROM players WHERE name = $1',
      [normalizedName]
    );

    return existingPlayerResult.match(
      async (result) => {
        let playerId: number;

        if (result.rowCount && result.rowCount > 0) {
          // Player exists
          playerId = result.rows[0].id;
        } else {
          // Create new player
          const insertResult = await Query<{ id: number }>(
            'INSERT INTO players (name) VALUES ($1) RETURNING id',
            [normalizedName]
          );
          
          const newPlayerId = await insertResult.match(
            (insertResult) => {
              if (insertResult.rowCount && insertResult.rowCount > 0) {
                return insertResult.rows[0].id;
              } else {
                return null;
              }
            },
            () => null
          );

          if (!newPlayerId) {
            return dbError('Failed to create player', 'DB_ERROR');
          }

          playerId = newPlayerId;
        }

        // Player game records are created during stat insertion, not here
        // This method just ensures the player exists in the players table

        return playerId;
      },
      (error) => dbError(`Failed to check existing player: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get player ID map for a specific team (for scraping compatibility)
   */
  async getPlayerIdMap(teamAbbr?: string): Promise<Record<string, number> | AppError> {

    let query = 'SELECT id, name FROM players WHERE name IS NOT NULL';
    const params: string[] = [];

    if (teamAbbr) {
      query = `
        SELECT DISTINCT p.id, p.name 
        FROM players p
        JOIN player_games pg ON p.id = pg.pid
        WHERE p.name IS NOT NULL AND pg.team = $1
      `;
      params.push(normalizeTeamAbbreviation(teamAbbr));
    }

    query += ' ORDER BY id';

    const result = await Query<{ id: number; name: string }>(query, params.length > 0 ? params : undefined);

    return result.match(
      (queryResult) => {
        const playerIdMap: Record<string, number> = {};
        queryResult.rows.forEach(player => {
          if (player.name) {
            playerIdMap[player.name] = player.id;
          }
        });
        return playerIdMap;
      },
      (error) => dbError(`Failed to fetch player ID map: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get teams that have data in the system
   */
  async getAvailableTeams(): Promise<string[] | AppError> {

    const result = await Query<{ team: string }>(
      'SELECT DISTINCT team FROM games ORDER BY team'
    );

    return result.match(
      (queryResult) => queryResult.rows.map(row => row.team),
      (error) => dbError(`Failed to fetch available teams: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get available seasons for a team
   */
  async getAvailableSeasons(teamAbbr?: string): Promise<number[] | AppError> {

    let query = 'SELECT DISTINCT season FROM games';
    const params: string[] = [];

    if (teamAbbr) {
      query += ' WHERE team = $1';
      params.push(normalizeTeamAbbreviation(teamAbbr));
    }

    query += ' ORDER BY season DESC';

    const result = await Query<{ season: number }>(query, params.length > 0 ? params : undefined);

    return result.match(
      (queryResult) => queryResult.rows.map(row => row.season),
      (error) => dbError(`Failed to fetch available seasons: ${error.message}`, 'DB_ERROR')
    );
  }

  /**
   * Get a player's current team status from the portal
   */
  async getPlayerTeamStatus(pid: number): Promise<{ currentTeam: string | null; isActive: boolean } | AppError> {
    try {
      const players = await PortalClient.getPlayers();
      const player = players.find(p => p.pid === pid);
      
      if (!player) {
        return { currentTeam: null, isActive: false };
      }
      
      return {
        currentTeam: player.isflTeam,
        isActive: player.status === 'active'
      };
    } catch (error) {
      return dbError(`Failed to get player team status: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DB_ERROR');
    }
  }
}

export const UnifiedDatabaseClient = new UnifiedDBClient();