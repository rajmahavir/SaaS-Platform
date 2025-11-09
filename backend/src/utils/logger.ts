/**
 * Logging Utility Module
 *
 * Provides comprehensive logging functionality using Winston.
 * Supports multiple transports (console, file, rotation), log levels,
 * and structured logging with metadata.
 *
 * @module utils/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Custom log format with timestamp, level, and message
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format with colors for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Log directory configuration
 */
const logDir = process.env.LOG_DIR || 'logs';

/**
 * Daily rotating file transport for all logs
 */
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  format: logFormat,
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * Daily rotating file transport for error logs
 */
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  maxSize: '20m',
  format: logFormat,
  level: 'error',
});

/**
 * Winston logger instance configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: process.env.APP_NAME || 'taskmanager-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: consoleFormat,
          }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
});

/**
 * Enhanced logger with additional utility methods
 */
export class Logger {
  /**
   * Logs an informational message
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   */
  static info(message: string, metadata?: Record<string, unknown>): void {
    logger.info(message, metadata);
  }

  /**
   * Logs a warning message
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   */
  static warn(message: string, metadata?: Record<string, unknown>): void {
    logger.warn(message, metadata);
  }

  /**
   * Logs an error message
   *
   * @param message - Log message
   * @param error - Error object or metadata
   */
  static error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else {
      logger.error(message, error);
    }
  }

  /**
   * Logs a debug message (only in development)
   *
   * @param message - Log message
   * @param metadata - Additional metadata
   */
  static debug(message: string, metadata?: Record<string, unknown>): void {
    logger.debug(message, metadata);
  }

  /**
   * Logs HTTP request information
   *
   * @param req - Express request object
   * @param statusCode - HTTP status code
   * @param responseTime - Response time in milliseconds
   */
  static http(req: {
    method: string;
    url: string;
    ip?: string;
    headers?: { 'user-agent'?: string };
  }, statusCode: number, responseTime: number): void {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  /**
   * Logs database query information
   *
   * @param query - SQL query or operation name
   * @param duration - Query duration in milliseconds
   * @param metadata - Additional metadata
   */
  static query(query: string, duration: number, metadata?: Record<string, unknown>): void {
    logger.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      ...metadata,
    });
  }

  /**
   * Logs security-related events
   *
   * @param event - Security event description
   * @param metadata - Additional metadata
   */
  static security(event: string, metadata?: Record<string, unknown>): void {
    logger.warn(`[SECURITY] ${event}`, metadata);
  }

  /**
   * Logs performance metrics
   *
   * @param metric - Metric name
   * @param value - Metric value
   * @param metadata - Additional metadata
   */
  static metric(metric: string, value: number, metadata?: Record<string, unknown>): void {
    logger.info(`[METRIC] ${metric}`, {
      value,
      ...metadata,
    });
  }

  /**
   * Creates a child logger with additional default metadata
   *
   * @param metadata - Default metadata for child logger
   * @returns Child logger instance
   */
  static child(metadata: Record<string, unknown>): winston.Logger {
    return logger.child(metadata);
  }
}

export default Logger;
