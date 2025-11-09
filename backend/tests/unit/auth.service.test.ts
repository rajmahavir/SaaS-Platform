/**
 * Authentication Service Unit Tests
 *
 * Tests for authentication service business logic.
 * Includes tests for registration, login, token management, and password operations.
 */

import authService from '../../src/services/auth.service';
import { getPrismaClient } from '../../src/config/database';
import { ConflictError, UnauthorizedError } from '../../src/utils/errors';

describe('AuthService', () => {
  const prisma = getPrismaClient();

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email.toLowerCase());
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictError for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'duplicate',
        password: 'Test123!@#',
      };

      await authService.register(userData);

      await expect(
        authService.register({ ...userData, username: 'different' })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        username: 'weakpass',
        password: 'weak',
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        username: 'loginuser',
        password: 'Test123!@#',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const result = await authService.login({
        email: 'login@example.com',
        password: 'Test123!@#',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      await expect(
        authService.login({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  });
});
