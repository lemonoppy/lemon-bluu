import { ResultAsync } from 'neverthrow';
import { Pool, QueryResult, QueryResultRow } from 'pg';

import { logger } from 'src/lib/logger';

import { DatabaseError } from '../../typings/errors.typings';

import { dbError } from './errors';


if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connectionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection on startup
connectionPool.connect()
  .then(client => {
    logger.info('Database connection successful');
    client.release();
  })
  .catch(err => {
    logger.error('Database connection failed on startup:', err.message);
  });

export default function Query<T extends QueryResultRow>(
  queryText: string,
  values?: string[] | undefined,
): ResultAsync<QueryResult<T>, DatabaseError> {
  return ResultAsync.fromPromise(
    connectionPool.query<T>(queryText, values),
    (error) => {
      logger.error('Database connection error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        queryText: queryText.substring(0, 100) + '...',
        paramCount: values?.length || 0
      });
      return dbError(
        'Database Connect Error',
        error instanceof Error ? error.message : String(error),
      );
    }
  );
}
