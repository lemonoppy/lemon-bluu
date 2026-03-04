import { Pool, QueryResult, QueryResultRow } from 'pg';

import { logger } from 'src/lib/logger';

let connectionPool: Pool | null = null;

if (process.env.DATABASE_URL) {
  connectionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  connectionPool
    .connect()
    .then((client) => {
      logger.info('Database connection successful');
      client.release();
    })
    .catch((err) => {
      logger.error('Database connection failed on startup:', err.message);
    });
} else {
  logger.warn('DATABASE_URL not set — stats context will not be available');
}

export default function Query<T extends QueryResultRow>(
  queryText: string,
   
  values?: any[],
): Promise<QueryResult<T>> {
  if (!connectionPool) {
    throw new Error('DATABASE_URL is not configured');
  }
  return connectionPool.query<T>(queryText, values);
}
