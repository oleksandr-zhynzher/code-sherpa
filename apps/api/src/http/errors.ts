import { type ZodError } from 'zod';

export type ApiErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

export type ApiError = Readonly<{
  error: Readonly<{
    code: ApiErrorCode;
    details?: unknown;
    message: string;
  }>;
}>;

export class NotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function errorResponse(code: ApiErrorCode, message: string, details?: unknown): ApiError {
  return {
    error: {
      code,
      details,
      message,
    },
  };
}

export function validationErrorResponse(error: ZodError): ApiError {
  return errorResponse('VALIDATION_ERROR', 'Invalid request data', error.flatten());
}
