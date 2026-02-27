import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import Query from 'src/lib/db';
import { dbError, notFoundError } from 'src/lib/errors';
import { logger } from 'src/lib/logger';
import { ensureTeamTables } from 'src/lib/tableManager';
import { resolveTeam } from 'src/lib/teamResolver';
import {
  DefensiveStats,
  GameStats,
  KickingStats,
  OtherStats,
  PassingStats,
  Player,
  PuntingStats,
  ReceivingStats,
  RushingStats
} from 'typings/db.typings';
import { AppError, DatabaseError } from 'typings/errors.typings';

class DBClient {
  #players: Array<Player> = [];
  #defensiveStats: Array<DefensiveStats> = [];
  #rushingStats: Array<RushingStats> = [];
  #receivingStats: Array<ReceivingStats> = [];
  #kickingStats: Array<KickingStats> = [];
  #puntingStats: Array<PuntingStats> = [];
  #otherStats: Array<OtherStats> = [];
  #passingStats: Array<PassingStats> = [];
  #gameStats: Array<GameStats> = [];

  #loaded = false;
  #lastLoadTimestamp = 0;
  #teamPrefix: string | null = null;
  #guildId: string | null = null;

  constructor(guildId?: string) {
    this.#guildId = guildId || null;
  }

  /**
   * Ensures team tables exist and gets the team prefix
   */
  #ensureTeamSetup(guildId?: string): ResultAsync<string, AppError> {
    const targetGuildId = guildId || this.#guildId || undefined;

    return resolveTeam(targetGuildId)
      .andThen(team => {
        if (!guildId) {
          this.#teamPrefix = team.dbPrefix;
        }
        return ensureTeamTables(team.dbPrefix).map(() => team.dbPrefix);
      });
  }

  #fetchPlayers(guildId?: string): ResultAsync<Player[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<Player>(
        `
          SELECT * 
          FROM ${prefix}_players
          WHERE pid IS NOT NULL
          AND onteam = true
          ORDER BY id, pid
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch players: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Players'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchDefensiveStats(guildId?: string): ResultAsync<DefensiveStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<DefensiveStats>(
        `
          SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
          FROM ${prefix}_defense stat
              JOIN ${prefix}_players players ON stat.pid = players.id
          WHERE players.firstname IS NOT NULL;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch defensive stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Defensive Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchRushingStats(guildId?: string): ResultAsync<RushingStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<RushingStats>(
        `
            SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
            FROM ${prefix}_rushing stat
                     JOIN ${prefix}_players players ON stat.pid = players.id
            WHERE players.firstname IS NOT NULL;
        `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch rushing stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Rushing Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchReceivingStats(guildId?: string): ResultAsync<ReceivingStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<ReceivingStats>(
        `
            SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
            FROM ${prefix}_receiving stat
                     JOIN ${prefix}_players players ON stat.pid = players.id
            WHERE players.firstname IS NOT NULL;
        `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch receiving stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Receiving Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchKickingStats(guildId?: string): ResultAsync<KickingStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<KickingStats>(
        `
          SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
          FROM ${prefix}_kicking stat
              JOIN ${prefix}_players players ON stat.pid = players.id
          WHERE players.firstname IS NOT NULL;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch kicking stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Kicking Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchPuntingStats(guildId?: string): ResultAsync<PuntingStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<PuntingStats>(
        `
          SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
          FROM ${prefix}_punting stat
              JOIN ${prefix}_players players ON stat.pid = players.id
          WHERE players.firstname IS NOT NULL;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch punting stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Punting Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchOtherStats(guildId?: string): ResultAsync<OtherStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<OtherStats>(
        `
          SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
          FROM ${prefix}_other stat
              JOIN ${prefix}_players players ON stat.pid = players.id
          WHERE players.firstname IS NOT NULL;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch other stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Other Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchPassingStats(guildId?: string): ResultAsync<PassingStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<PassingStats>(
        `
          SELECT players.pid AS "pid", players.firstname, players.lastname, players.position, players.onteam, players.status, stat.*
          FROM ${prefix}_passing stat
              JOIN ${prefix}_players players ON stat.pid = players.id
          WHERE players.firstname IS NOT NULL;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch passing stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Passing Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  #fetchGameStats(guildId?: string): ResultAsync<GameStats[], AppError> {
    return this.#ensureTeamSetup(guildId).andThen(prefix =>
      Query<GameStats>(
        `
          SELECT *
          FROM ${prefix}_games;
      `
      )
        .mapErr(
          (error): DatabaseError =>
            dbError(`Failed to fetch game stats: ${error.message}`, 'DB_ERROR'),
        )
        .andThen((result) => {
          if (result.rowCount === 0) {
            return errAsync(notFoundError('Game Stats'));
          }
          return okAsync(result.rows);
        })
    );
  }

  async getPlayers(reload: boolean = true, guildId?: string): Promise<Player[] | AppError> {
    if (this.#players.length > 0 && !reload) {
      return this.#players;
    }

    const playersResponse = await this.#fetchPlayers(guildId);

    return playersResponse.match(
      (players) => {
        this.#players = players;
        return this.#players;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getDefensiveStats(reload: boolean = true, guildId?: string): Promise<DefensiveStats[] | AppError> {
    if (this.#defensiveStats.length > 0 && !reload) {
      return this.#defensiveStats;
    }

    const statsResponse = await this.#fetchDefensiveStats(guildId);

    return statsResponse.match(
      (players) => {
        this.#defensiveStats = players;
        return this.#defensiveStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getRushingStats(reload: boolean = true, guildId?: string): Promise<RushingStats[] | AppError> {
    if (this.#rushingStats.length > 0 && !reload) {
      return this.#rushingStats;
    }

    const statsResponse = await this.#fetchRushingStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#rushingStats = records;
        return this.#rushingStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getReceivingStats(reload: boolean = true, guildId?: string): Promise<ReceivingStats[] | AppError> {
    if (this.#receivingStats.length > 0 && !reload) {
      return this.#receivingStats;
    }

    const statsResponse = await this.#fetchReceivingStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#receivingStats = records;
        return this.#receivingStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getKickingStats(reload: boolean = true, guildId?: string): Promise<KickingStats[] | AppError> {
    if (this.#kickingStats.length > 0 && !reload) {
      return this.#kickingStats;
    }

    const statsResponse = await this.#fetchKickingStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#kickingStats = records;
        return this.#kickingStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getPuntingStats(reload: boolean = true, guildId?: string): Promise<PuntingStats[] | AppError> {
    if (this.#puntingStats.length > 0 && !reload) {
      return this.#puntingStats;
    }

    const statsResponse = await this.#fetchPuntingStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#puntingStats = records;
        return this.#puntingStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getOtherStats(reload: boolean = true, guildId?: string): Promise<OtherStats[] | AppError> {
    if (this.#otherStats.length > 0 && !reload) {
      return this.#otherStats;
    }

    const statsResponse = await this.#fetchOtherStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#otherStats = records;
        return this.#otherStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getPassingStats(reload: boolean = true, guildId?: string): Promise<PassingStats[] | AppError> {
    if (this.#passingStats.length > 0 && !reload) {
      return this.#passingStats;
    }

    const statsResponse = await this.#fetchPassingStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#passingStats = records;
        return this.#passingStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async getGameStats(reload: boolean = true, guildId?: string): Promise<GameStats[] | AppError> {
    if (this.#gameStats.length > 0 && !reload) {
      return this.#gameStats;
    }

    const statsResponse = await this.#fetchGameStats(guildId);

    return statsResponse.match(
      (records) => {
        this.#gameStats = records;
        return this.#gameStats;
      },
      (error) => {
        switch (error.type) {
          case 'DATABASE_ERROR':
            logger.error('Database error:', error.message);
            return error;
          case 'VALIDATION_ERROR':
            logger.error('Validation failed:', error.fields);
            return error;
          case 'NOT_FOUND':
            logger.error('Not found:', error.resource);
            return error;
        }
      },
    );
  }

  async reload(): Promise<void> {
    this.#loaded = false;

    await Promise.all([
      await this.getPlayers(true),
      await this.getDefensiveStats(true),
      await this.getRushingStats(true),
      await this.getReceivingStats(true),
      await this.getKickingStats(true),
      await this.getPuntingStats(true),
      await this.getOtherStats(true),
      await this.getPassingStats(true),
      await this.getGameStats(true),
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

  async getPlayerIdMap(guildId?: string): Promise<Record<string, number> | AppError> {
    const teamSetupResult = await this.#ensureTeamSetup(guildId);

    if (teamSetupResult.isErr()) {
      return teamSetupResult.error;
    }

    const prefix = teamSetupResult.value;
    const playersResult = await Query<{ id: number; name: string }>(
      `SELECT id, name FROM ${prefix}_players WHERE name IS NOT NULL ORDER BY id`
    );

    return playersResult.match(
      (result) => {
        const playerIdMap: Record<string, number> = {};
        result.rows.forEach(player => {
          if (player.name) {
            playerIdMap[player.name] = player.id;
          }
        });
        return playerIdMap;
      },
      (error) => dbError(`Failed to fetch player ID map: ${error.message}`, 'DB_ERROR')
    );
  }

  async createOrUpdatePlayer(name: string, firstName?: string, lastName?: string, guildId?: string): Promise<number | AppError> {
    const normalizedName = name ? name.replace(/[.]/g, '').trim() : '';
    if (!normalizedName || normalizedName === '{{sname}}') {
      return dbError('Invalid player name', 'VALIDATION_ERROR');
    }

    const teamSetupResult = await this.#ensureTeamSetup(guildId);
    if (teamSetupResult.isErr()) {
      return teamSetupResult.error;
    }

    const prefix = teamSetupResult.value;

    const existingPlayerResult = await Query<{ id: number }>(
      `SELECT id FROM ${prefix}_players WHERE name = $1`,
      [normalizedName]
    );

    return existingPlayerResult.match(
      async (result) => {
        if (result.rowCount && result.rowCount > 0) {
          return result.rows[0].id;
        } else {
          const insertResult = await Query<{ id: number }>(
            `INSERT INTO ${prefix}_players (name, firstname, lastname) 
             VALUES ($1, $2, $3) 
             RETURNING id`,
            [normalizedName, firstName || '', lastName || '']
          );
          
          return insertResult.match(
            (insertResult) => {
              if (insertResult.rowCount && insertResult.rowCount > 0) {
                return insertResult.rows[0].id;
              } else {
                return dbError('Failed to create player', 'DB_ERROR');
              }
            },
            (error) => dbError(`Failed to create player: ${error.message}`, 'DB_ERROR')
          );
        }
      },
      (error) => dbError(`Failed to check existing player: ${error.message}`, 'DB_ERROR')
    );
  }
}

export const DatabaseClient = new DBClient();
