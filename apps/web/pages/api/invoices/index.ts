import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import Query from '@/lib/db';
import { dbError, notFoundError, validationError } from '@/lib/errors';
import logger from '@/lib/logger';
import { Invoice } from '@/typings/db.typings';
import { AppError, DatabaseError } from '@/typings/errors.typings';

import type { NextApiRequest, NextApiResponse } from 'next';

function getInvoices(amount?: string): ResultAsync<Invoice[], AppError> {
  if (amount && isNaN(Number(amount))) {
    return errAsync(
      validationError('Amount must be a number', { amount: 'Invalid' }),
    );
  }

  const params = amount ? [amount] : undefined;

  return Query<Invoice>(
    `
        SELECT * 
        FROM invoices
    `.concat(amount ? ` WHERE amount = $1` : ''),
    params,
  )
    .mapErr(
      (error): DatabaseError =>
        dbError(`Failed to fetch invoices: ${error.message}`, 'DB_ERROR'),
    )
    .andThen((result) => {
      if (result.rowCount === 0) {
        return errAsync(notFoundError('Invoices'));
      }
      return okAsync(result.rows);
    });
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<Invoice[] | { error: AppError }>,
): Promise<void> => {
  if (req.method !== 'GET') {
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const amountParam = req.query.amount;
  const amount =
    typeof amountParam === 'string'
      ? amountParam
      : Array.isArray(amountParam)
        ? amountParam[0]
        : undefined;

  const invoicesResponse = await getInvoices(amount);

  invoicesResponse.match(
    (invoices) => {
      res.status(200).json(invoices);
    },
    (error) => {
      switch (error.type) {
        case 'DATABASE_ERROR':
          logger.error({ message: error.message }, 'Database error');
          res.status(500).json({
            error,
          });
          break;
        case 'VALIDATION_ERROR':
          logger.error({ fields: error.fields }, 'Validation failed');
          res.status(400).json({
            error,
          });
          break;
        case 'NOT_FOUND':
          logger.error({ resource: error.resource }, 'Not found');
          res.status(404).json({
            error,
          });
          break;
      }
    },
  );
};

export default handler;
