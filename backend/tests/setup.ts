/**
 * Jest Test Setup
 *
 * Global test configuration and setup for Jest tests.
 * Configures test environment, mocks, and utilities.
 */

import { getPrismaClient } from '../src/config/database';
import { getRedisClient } from '../src/config/redis';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/taskmanager_test';

// Global test timeout
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Database migrations and seed can be run here
});

// Cleanup after all tests
afterAll(async () => {
  const prisma = getPrismaClient();
  const redis = getRedisClient();

  await prisma.$disconnect();
  await redis.quit();
});

// Clear database between tests
beforeEach(async () => {
  // Clear cache
  const redis = getRedisClient();
  await redis.flushdb();
});
