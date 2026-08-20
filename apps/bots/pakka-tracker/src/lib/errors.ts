export interface AppError {
  message: string;
  code: string;
}

export interface DatabaseError extends AppError {
  code: 'DB_ERROR';
  detail?: string;
}

export const dbError = (message: string, detail?: string): DatabaseError => ({
  message,
  code: 'DB_ERROR',
  detail,
});
