import { ResultAsync } from 'neverthrow';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

import { logger } from 'src/lib/logger';

import { DatabaseError, dbError } from './errors';

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', (error) => {
      logger.error(error, 'Unexpected Postgres pool error');
    });
  }
  return pool;
};

export default function Query<T extends QueryResultRow>(
  queryText: string,
  values?: unknown[],
): ResultAsync<QueryResult<T>, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => getPool().query<T>(queryText, values))(),
    (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { error: message, queryText: queryText.slice(0, 200) },
        'Database query failed',
      );
      return dbError('Database query failed', message);
    },
  );
}

// Runs a set of statements atomically on a dedicated client. Used by the
// Riftbound sync so one event's rows can't be partially written.
export const withTransaction = <T>(
  fn: (client: PoolClient) => Promise<T>,
): ResultAsync<T, DatabaseError> =>
  ResultAsync.fromPromise(
    (async () => {
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    })(),
    (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'Database transaction failed');
      return dbError('Database transaction failed', message);
    },
  );
