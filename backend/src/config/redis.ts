/**
 * Redis Configuration Module
 *
 * Provides centralized Redis connection management and caching utilities.
 * Supports connection pooling, automatic reconnection, and error handling.
 * Implements common caching patterns and utilities.
 *
 * @module config/redis
 */

import Redis, { Redis as RedisClient, RedisOptions } from 'ioredis';
import logger from '@/utils/logger';

/**
 * Singleton Redis client instance
 */
let redisClient: RedisClient | null = null;

/**
 * Redis configuration from environment variables
 */
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number): number | null => {
    const delay = Math.min(times * 50, 2000);
    if (times > 20) {
      logger.error('Redis connection failed after 20 attempts');
      return null;
    }
    return delay;
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  showFriendlyErrorStack: process.env.NODE_ENV === 'development',
};

/**
 * Creates and configures a new Redis client instance
 *
 * @returns Configured Redis client
 */
const createRedisClient = (): RedisClient => {
  const client = new Redis(redisConfig);

  // Event handlers
  client.on('connect', () => {
    logger.info('Redis client connecting...');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (error: Error) => {
    logger.error('Redis client error:', error);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  client.on('end', () => {
    logger.info('Redis connection ended');
  });

  return client;
};

/**
 * Retrieves or creates the Redis client instance
 *
 * @returns Redis client instance
 */
export const getRedisClient = (): RedisClient => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

/**
 * Connects to Redis server
 *
 * @throws Error if connection fails
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.connect();
    await client.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error as Error);
    throw error;
  }
};

/**
 * Gracefully disconnects from Redis
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error as Error);
    throw error;
  }
};

/**
 * Checks if Redis connection is healthy
 *
 * @returns true if connection is healthy, false otherwise
 */
export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error as Error);
    return false;
  }
};

/**
 * Cache utility class with common caching patterns
 */
export class CacheService {
  private client: RedisClient;
  private defaultTTL: number = 3600; // 1 hour in seconds

  constructor(client: RedisClient, defaultTTL?: number) {
    this.client = client;
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }

  /**
   * Sets a value in cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiry = ttl || this.defaultTTL;
    await this.client.setex(key, expiry, serialized);
    logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
  }

  /**
   * Retrieves a value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.client.get(key);
    if (!cached) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    logger.debug(`Cache hit: ${key}`);
    return JSON.parse(cached) as T;
  }

  /**
   * Deletes a value from cache
   *
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Deletes all keys matching a pattern
   *
   * @param pattern - Key pattern (e.g., "user:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
      logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
    }
  }

  /**
   * Checks if a key exists in cache
   *
   * @param key - Cache key
   * @returns true if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Gets or sets a value using a callback function
   * Implements cache-aside pattern
   *
   * @param key - Cache key
   * @param callback - Function to call if cache miss
   * @param ttl - Time to live in seconds
   * @returns Cached or computed value
   */
  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increments a counter in cache
   *
   * @param key - Cache key
   * @param ttl - Time to live in seconds (only set on first increment)
   * @returns New counter value
   */
  async increment(key: string, ttl?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1 && ttl) {
      await this.client.expire(key, ttl);
    }
    return value;
  }

  /**
   * Clears all cache entries
   * USE WITH CAUTION in production
   */
  async clear(): Promise<void> {
    await this.client.flushdb();
    logger.warn('Cache cleared');
  }
}

// Export singleton cache service instance
export const cache = new CacheService(getRedisClient());

export default getRedisClient;
