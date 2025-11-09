/**
 * Rate Limiting Middleware Module
 *
 * Provides rate limiting functionality to prevent abuse.
 * Implements multiple rate limiting strategies for different endpoints.
 * Uses Redis for distributed rate limiting across multiple instances.
 *
 * @module middleware/rateLimiter
 */

import rateLimit from 'express-rate-limit';
import { getRedisClient } from '@/config/redis';
import { TooManyRequestsError } from '@/utils/errors';
import logger from '@/utils/logger';
import { Request, Response } from 'express';

/**
 * Redis store for rate limiting (distributed)
 */
class RedisStore {
  private client = getRedisClient();
  private prefix = 'ratelimit:';

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const fullKey = this.prefix + key;
    const ttl = 15 * 60; // 15 minutes in seconds

    const hits = await this.client.incr(fullKey);

    if (hits === 1) {
      await this.client.expire(fullKey, ttl);
    }

    const ttlRemaining = await this.client.ttl(fullKey);
    const resetTime = ttlRemaining > 0
      ? new Date(Date.now() + ttlRemaining * 1000)
      : undefined;

    return {
      totalHits: hits,
      resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.client.decr(fullKey);
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.client.del(fullKey);
  }
}

/**
 * Rate limit handler
 * Called when rate limit is exceeded
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  logger.security('Rate limit exceeded', {
    ip: req.ip,
    url: req.url,
    method: req.method,
  });

  throw new TooManyRequestsError('Too many requests, please try again later');
};

/**
 * Skip failed requests from counting against rate limit
 */
const skipFailedRequests = (req: Request, res: Response): boolean => {
  return res.statusCode < 400;
};

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per 15 minutes
 */
export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.url === '/health' || req.url === '/metrics';
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 * 5 requests per 15 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipFailedRequests: true,
});

/**
 * Authentication rate limiter
 * 5 login attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true,
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many accounts created from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * File upload rate limiter
 * 20 uploads per hour
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * API key rate limiter
 * 1000 requests per hour
 */
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
});

export default standardRateLimiter;
