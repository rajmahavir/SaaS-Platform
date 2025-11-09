/**
 * Error Handler Middleware Module
 *
 * Provides centralized error handling for the application.
 * Formats errors for client responses and logs them appropriately.
 * Handles different types of errors (operational, programming, validation).
 *
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError, isAppError, ErrorHandler } from '@/utils/errors';
import logger from '@/utils/logger';
import { Prisma } from '@prisma/client';

/**
 * Handles Prisma-specific errors and converts them to AppError
 *
 * @param error - Prisma error
 * @returns Converted AppError
 */
const handlePrismaError = (error: unknown): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return new AppError(
          'A record with this value already exists',
          StatusCodes.CONFLICT,
          true,
          'DUPLICATE_ENTRY',
          { field: error.meta?.target }
        );
      case 'P2025':
        // Record not found
        return new AppError('Record not found', StatusCodes.NOT_FOUND, true, 'NOT_FOUND');
      case 'P2003':
        // Foreign key constraint violation
        return new AppError(
          'Related record not found',
          StatusCodes.BAD_REQUEST,
          true,
          'FOREIGN_KEY_VIOLATION'
        );
      case 'P2014':
        // Invalid ID
        return new AppError('Invalid ID provided', StatusCodes.BAD_REQUEST, true, 'INVALID_ID');
      default:
        return new AppError(
          'Database operation failed',
          StatusCodes.INTERNAL_SERVER_ERROR,
          true,
          'DATABASE_ERROR',
          { code: error.code }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      'Invalid data provided',
      StatusCodes.BAD_REQUEST,
      true,
      'VALIDATION_ERROR'
    );
  }

  return new AppError('Database error occurred', StatusCodes.INTERNAL_SERVER_ERROR, false);
};

/**
 * Main error handler middleware
 * Catches all errors and sends appropriate responses
 *
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let appError: AppError;

  // Convert error to AppError if it isn't already
  if (isAppError(error)) {
    appError = error;
  } else if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    appError = handlePrismaError(error);
  } else {
    // Unknown error - treat as internal server error
    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      false
    );
  }

  // Log error
  if (appError.statusCode >= 500) {
    logger.error('Server error', {
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: appError.statusCode,
        code: appError.code,
      },
      request: {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        ip: req.ip,
      },
    });
  } else {
    logger.warn('Client error', {
      message: error.message,
      statusCode: appError.statusCode,
      code: appError.code,
      url: req.url,
    });
  }

  // Send error response
  const response = ErrorHandler.formatError(appError);

  res.status(appError.statusCode).json({
    success: false,
    error: response,
  });
};

/**
 * 404 Not Found handler
 * Handles requests to non-existent routes
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: StatusCodes.NOT_FOUND,
    },
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 *
 * @param fn - Async route handler function
 * @returns Wrapped function with error handling
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
