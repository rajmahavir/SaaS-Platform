/**
 * Custom Error Classes Module
 *
 * Provides comprehensive error handling with custom error types.
 * Implements error hierarchy for different error scenarios.
 * Supports HTTP status codes and detailed error messages.
 *
 * @module utils/errors
 */

import { StatusCodes } from 'http-status-codes';

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    code?: string,
    details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * Bad Request Error (400)
 * Used for invalid client requests
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: unknown) {
    super(message, StatusCodes.BAD_REQUEST, true, 'BAD_REQUEST', details);
  }
}

/**
 * Validation Error (422)
 * Used for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', details?: unknown) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, true, 'VALIDATION_ERROR', details);
  }
}

/**
 * Unauthorized Error (401)
 * Used for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, StatusCodes.UNAUTHORIZED, true, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error (403)
 * Used for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN, true, 'FORBIDDEN');
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource Not Found') {
    super(message, StatusCodes.NOT_FOUND, true, 'NOT_FOUND');
  }
}

/**
 * Conflict Error (409)
 * Used for resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource Conflict') {
    super(message, StatusCodes.CONFLICT, true, 'CONFLICT');
  }
}

/**
 * Too Many Requests Error (429)
 * Used for rate limiting
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too Many Requests') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, true, 'TOO_MANY_REQUESTS');
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: unknown) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, true, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Database Error
 * Used for database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database Error', details?: unknown) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, true, 'DATABASE_ERROR', details);
  }
}

/**
 * Service Unavailable Error (503)
 * Used when service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable') {
    super(message, StatusCodes.SERVICE_UNAVAILABLE, true, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Token Expired Error (401)
 * Used when authentication token has expired
 */
export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token Expired') {
    super(message, StatusCodes.UNAUTHORIZED, true, 'TOKEN_EXPIRED');
  }
}

/**
 * Invalid Token Error (401)
 * Used when authentication token is invalid
 */
export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid Token') {
    super(message, StatusCodes.UNAUTHORIZED, true, 'INVALID_TOKEN');
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Determines if an error is operational (expected) or programming error
   *
   * @param error - Error to check
   * @returns true if error is operational
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Formats error for client response
   *
   * @param error - Error to format
   * @returns Formatted error object
   */
  static formatError(error: AppError): {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
    stack?: string;
  } {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };
  }

  /**
   * Handles async errors in Express route handlers
   * Wraps async functions to catch errors and pass to next()
   *
   * @param fn - Async route handler function
   * @returns Wrapped function with error handling
   */
  static catchAsync(
    fn: (req: unknown, res: unknown, next: unknown) => Promise<unknown>
  ): (req: unknown, res: unknown, next: unknown) => void {
    return (req: unknown, res: unknown, next: unknown): void => {
      Promise.resolve(fn(req, res, next)).catch(next as (reason: any) => PromiseLike<never>);
    };
  }
}

/**
 * Custom type guard for AppError
 *
 * @param error - Error to check
 * @returns true if error is an AppError instance
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export default AppError;
