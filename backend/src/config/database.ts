/**
 * Database Configuration Module
 *
 * Provides centralized database connection management using Prisma ORM.
 * Implements singleton pattern to ensure single database connection instance.
 * Includes connection pooling, error handling, and graceful shutdown.
 *
 * @module config/database
 */

import { PrismaClient } from '@prisma/client';
import logger from '@/utils/logger';

/**
 * Interface for database configuration options
 */
interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  enableLogging: boolean;
}

/**
 * Singleton Prisma client instance
 */
let prisma: PrismaClient | null = null;

/**
 * Creates and configures a new Prisma client instance
 *
 * @param config - Database configuration options
 * @returns Configured Prisma client instance
 */
const createPrismaClient = (config: DatabaseConfig): PrismaClient => {
  return new PrismaClient({
    datasources: {
      db: {
        url: config.url,
      },
    },
    log: config.enableLogging
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
          { level: 'info', emit: 'event' },
        ]
      : ['error'],
  });
};

/**
 * Retrieves or creates the Prisma client instance
 * Implements singleton pattern for database connection
 *
 * @returns Prisma client instance
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    const config: DatabaseConfig = {
      url: process.env.DATABASE_URL || '',
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
      enableLogging: process.env.NODE_ENV === 'development',
    };

    prisma = createPrismaClient(config);

    // Set up logging for Prisma events
    if (config.enableLogging) {
      prisma.$on('query' as never, (e: unknown) => {
        logger.debug('Prisma Query', e);
      });

      prisma.$on('error' as never, (e: unknown) => {
        logger.error('Prisma Error', e);
      });

      prisma.$on('warn' as never, (e: unknown) => {
        logger.warn('Prisma Warning', e);
      });
    }

    logger.info('Database connection established');
  }

  return prisma;
};

/**
 * Connects to the database and verifies the connection
 *
 * @throws Error if connection fails
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    await client.$queryRaw`SELECT 1`; // Test query to verify connection
    logger.info('Database connection verified');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Gracefully disconnects from the database
 * Should be called during application shutdown
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
};

/**
 * Checks if database connection is healthy
 *
 * @returns true if connection is healthy, false otherwise
 */
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Executes database operations within a transaction
 *
 * @param callback - Function containing database operations to execute
 * @returns Result of the transaction
 * @throws Error if transaction fails
 */
export const executeTransaction = async <T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> => {
  const client = getPrismaClient();
  try {
    return await client.$transaction(async (tx) => {
      return await callback(tx as PrismaClient);
    });
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw error;
  }
};

// Export default Prisma client getter
export default getPrismaClient;
