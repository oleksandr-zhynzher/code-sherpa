import { type ZodError } from 'zod';

export type ApiErrorCode =
  | 'AGENT_UNAVAILABLE'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR';

export type ApiError = Readonly<{
  error: Readonly<{
    code: ApiErrorCode;
    details?: unknown;
    message: string;
    requestId?: string;
    retryable?: boolean;
  }>;
}>;

export class NotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AgentUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AgentUnavailableError';
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  options?: Readonly<{ details?: unknown; requestId?: string; retryable?: boolean }>,
): ApiError {
  return {
    error: {
      code,
      message,
      ...(options?.details !== undefined && { details: options.details }),
      ...(options?.requestId !== undefined && { requestId: options.requestId }),
      ...(options?.retryable !== undefined && { retryable: options.retryable }),
    },
  };
}

export function validationErrorResponse(error: ZodError, requestId?: string): ApiError {
  return errorResponse('VALIDATION_ERROR', 'Invalid request data', {
    details: error.flatten(),
    ...(requestId !== undefined && { requestId }),
  });
}
