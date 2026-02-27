import { ResultAsync, okAsync } from 'neverthrow';

import { AppError, DatabaseError } from 'typings/errors.typings';

import Query from './db';
import { dbError } from './errors';


/**
 * SQL schemas for creating team-specific tables
 */
const TABLE_SCHEMAS = {
  players: `
    CREATE TABLE IF NOT EXISTS __PREFIX___players (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      pid INTEGER,
      uid INTEGER,
      firstname VARCHAR(255),
      lastname VARCHAR(255),
      position VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retired', 'bot')),
      onteam BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___players_pid ON __PREFIX___players(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___players_onteam ON __PREFIX___players(onteam);
  `,

  gameStats: `
    CREATE TABLE IF NOT EXISTS __PREFIX___games (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      home BOOLEAN DEFAULT false,
      opponent VARCHAR(255),
      score INTEGER DEFAULT 0,
      opponentscore INTEGER DEFAULT 0,
      isplayoffs BOOLEAN DEFAULT false,
      win BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___games_season_week ON __PREFIX___games(season, week);
  `,

  passing: `
    CREATE TABLE IF NOT EXISTS __PREFIX___passing (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      completions INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      completionpct DECIMAL(5,2) DEFAULT 0,
      yards INTEGER DEFAULT 0,
      ypa DECIMAL(5,2) DEFAULT 0,
      td INTEGER DEFAULT 0,
      int INTEGER DEFAULT 0,
      rating DECIMAL(5,2) DEFAULT 0,
      sacks INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___passing_pid ON __PREFIX___passing(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___passing_season_week ON __PREFIX___passing(season, week);
  `,

  rushing: `
    CREATE TABLE IF NOT EXISTS __PREFIX___rushing (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      yards INTEGER DEFAULT 0,
      ypc DECIMAL(5,2) DEFAULT 0,
      long INTEGER DEFAULT 0,
      td INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___rushing_pid ON __PREFIX___rushing(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___rushing_season_week ON __PREFIX___rushing(season, week);
  `,

  receiving: `
    CREATE TABLE IF NOT EXISTS __PREFIX___receiving (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      receptions INTEGER DEFAULT 0,
      targets INTEGER DEFAULT 0,
      yards INTEGER DEFAULT 0,
      ypr DECIMAL(5,2) DEFAULT 0,
      long INTEGER DEFAULT 0,
      td INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___receiving_pid ON __PREFIX___receiving(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___receiving_season_week ON __PREFIX___receiving(season, week);
  `,

  defense: `
    CREATE TABLE IF NOT EXISTS __PREFIX___defense (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      tck INTEGER DEFAULT 0,
      tfl INTEGER DEFAULT 0,
      sack INTEGER DEFAULT 0,
      ff INTEGER DEFAULT 0,
      fr INTEGER DEFAULT 0,
      pd INTEGER DEFAULT 0,
      int INTEGER DEFAULT 0,
      sfty INTEGER DEFAULT 0,
      td INTEGER DEFAULT 0,
      blkp INTEGER DEFAULT 0,
      blkxp INTEGER DEFAULT 0,
      blkfg INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___defense_pid ON __PREFIX___defense(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___defense_season_week ON __PREFIX___defense(season, week);
  `,

  kicking: `
    CREATE TABLE IF NOT EXISTS __PREFIX___kicking (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      xpmade INTEGER DEFAULT 0,
      xpatt INTEGER DEFAULT 0,
      fgunder20made INTEGER DEFAULT 0,
      fgunder20att INTEGER DEFAULT 0,
      fg20_29made INTEGER DEFAULT 0,
      fg20_29att INTEGER DEFAULT 0,
      fg30_39made INTEGER DEFAULT 0,
      fg30_39att INTEGER DEFAULT 0,
      fg40_49made INTEGER DEFAULT 0,
      fg40_49att INTEGER DEFAULT 0,
      fg50plusmade INTEGER DEFAULT 0,
      fg50plusatt INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___kicking_pid ON __PREFIX___kicking(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___kicking_season_week ON __PREFIX___kicking(season, week);
  `,

  punting: `
    CREATE TABLE IF NOT EXISTS __PREFIX___punting (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      punts INTEGER DEFAULT 0,
      yds INTEGER DEFAULT 0,
      avg DECIMAL(5,2) DEFAULT 0,
      lng INTEGER DEFAULT 0,
      inside20 INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___punting_pid ON __PREFIX___punting(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___punting_season_week ON __PREFIX___punting(season, week);
  `,

  other: `
    CREATE TABLE IF NOT EXISTS __PREFIX___other (
      id SERIAL PRIMARY KEY,
      season INTEGER NOT NULL,
      week INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      penalties    integer default 0,
      yards        integer default 0,
      pancakes     integer default 0,
      sacksallowed integer default 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pid) REFERENCES __PREFIX___players(id)
    );
    CREATE INDEX IF NOT EXISTS idx___PREFIX___other_pid ON __PREFIX___other(pid);
    CREATE INDEX IF NOT EXISTS idx___PREFIX___other_season_week ON __PREFIX___other(season, week);
  `
};

/**
 * Creates all necessary tables for a team with the given prefix
 */
export function createTeamTables(teamPrefix: string): ResultAsync<void, AppError> {
  const tableCreationPromises = Object.entries(TABLE_SCHEMAS).map(([tableName, schema]) => {
    const sql = schema.replace(/__PREFIX__/g, teamPrefix);
    return Query(sql).mapErr(
      (error): DatabaseError =>
        dbError(`Failed to create ${tableName} table for ${teamPrefix}: ${error.message}`, 'DB_ERROR')
    );
  });

  return ResultAsync.combine(tableCreationPromises).map(() => undefined);
}

/**
 * Checks if tables exist for a given team prefix
 */
export function checkTeamTablesExist(teamPrefix: string): ResultAsync<boolean, AppError> {
  const tablesToCheck = Object.keys(TABLE_SCHEMAS).map(table => {
    if (table === 'gameStats') return `${teamPrefix}_games`;
    return `${teamPrefix}_${table}`;
  });

  // Use a simpler approach with multiple OR conditions instead of ANY()
  const whereConditions = tablesToCheck.map((_, index) => `table_name = $${index + 1}`).join(' OR ');

  return Query<{ exists: boolean }>(
    `
      SELECT COUNT(*) > 0 as exists
      FROM information_schema.tables 
      WHERE ${whereConditions}
    `,
    tablesToCheck
  )
    .mapErr(
      (error): DatabaseError =>
        dbError(`Failed to check table existence for ${teamPrefix}: ${error.message}`, 'DB_ERROR')
    )
    .map(result => result.rows[0]?.exists || false);
}

/**
 * Ensures all tables exist for a team prefix, creating them if they don't
 */
export function ensureTeamTables(teamPrefix: string): ResultAsync<void, AppError> {
  return checkTeamTablesExist(teamPrefix).andThen(exists => {
    if (!exists) {
      return createTeamTables(teamPrefix);
    }
    return okAsync(undefined);
  });
}
