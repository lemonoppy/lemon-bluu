import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from '../../typings/errors.typings';

const dbError = (message: string, code: string): DatabaseError => ({
  type: 'DATABASE_ERROR',
  message,
  code,
});

const validationError = (
  message: string,
  fields: Record<string, string>,
): ValidationError => ({
  type: 'VALIDATION_ERROR',
  message,
  fields,
});

const notFoundError = (resource: string): NotFoundError => ({
  type: 'NOT_FOUND',
  message: `${resource} not found`,
  resource,
});

export { dbError, validationError, notFoundError };
