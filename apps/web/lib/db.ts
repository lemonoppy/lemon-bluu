import { neon } from '@neondatabase/serverless';
import { ResultAsync } from 'neverthrow';
import { QueryResult, QueryResultRow } from 'pg';

import { dbError } from '@/lib/errors';
import { DatabaseError } from '@/typings/errors.typings';

const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

export default function Query<T extends QueryResultRow>(
  queryText: string,
  values?: unknown[] | undefined,
): ResultAsync<QueryResult<T>, DatabaseError> {
  return ResultAsync.fromPromise(
    sql.query(queryText, values as unknown[]) as unknown as Promise<QueryResult<T>>,
    (error) =>
      dbError(
        'Database Connect Error',
        error instanceof Error ? error.message : String(error),
      ),
  );
}
