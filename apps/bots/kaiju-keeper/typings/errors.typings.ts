export type DatabaseError = {
  fields?: string;
  type: 'DATABASE_ERROR';
  message: string;
  code: string;
};

export type ValidationError = {
  type: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
};

export type NotFoundError = {
  type: 'NOT_FOUND';
  message: string;
  resource: string;
};

export type AppError = DatabaseError | ValidationError | NotFoundError;