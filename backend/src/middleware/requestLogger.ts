/**
 * Request Logger Middleware Module
 *
 * Provides HTTP request/response logging functionality.
 * Logs request details, response time, and status codes.
 * Implements performance monitoring and security logging.
 *
 * @module middleware/requestLogger
 */

import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '@/utils/logger';

/**
 * Morgan token for request body (sanitized)
 */
morgan.token('body', (req: Request) => {
  const body = { ...req.body };

  // Sanitize sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  sensitiveFields.forEach((field) => {
    if (body[field]) {
      body[field] = '[REDACTED]';
    }
  });

  return JSON.stringify(body);
});

/**
 * Morgan token for user ID
 */
morgan.token('user-id', (req: Request) => {
  const authReq = req as { user?: { userId: string } };
  return authReq.user?.userId || 'anonymous';
});

/**
 * Custom morgan format for development
 */
const developmentFormat = ':method :url :status :response-time ms - :res[content-length]';

/**
 * Custom morgan format for production
 */
const productionFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
});

/**
 * Morgan stream to integrate with Winston logger
 */
const stream = {
  write: (message: string): void => {
    // @ts-ignore - Winston logger signature compatibility
    logger.http(message.trim());
  },
};

/**
 * Development request logger
 */
export const developmentLogger = morgan(developmentFormat, { stream });

/**
 * Production request logger
 */
export const productionLogger = morgan(productionFormat, {
  stream,
  skip: (req) => {
    // Skip health checks and metrics in logs
    return req.url === '/health' || req.url === '/metrics';
  },
});

/**
 * Request logger middleware based on environment
 */
export const requestLogger =
  process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger;

/**
 * Custom request logging middleware with performance tracking
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Listen for response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const authReq = req as { user?: { userId: string } };

    // @ts-ignore - Winston logger signature compatibility
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: authReq.user?.userId,
    });

    // Log slow requests
    if (duration > 3000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
      });
    }

    // Log errors
    if (res.statusCode >= 500) {
      logger.error('Server error response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

/**
 * Security event logger
 * Logs potentially suspicious activities
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Log authentication failures
  if (req.url.includes('/auth/') && res.statusCode === 401) {
    logger.security('Authentication failure', {
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Log authorization failures
  if (res.statusCode === 403) {
    logger.security('Authorization failure', {
      url: req.url,
      ip: req.ip,
      method: req.method,
    });
  }

  next();
};

export default requestLogger;
