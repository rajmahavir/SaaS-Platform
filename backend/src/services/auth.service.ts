/**
 * Authentication Service Module
 *
 * Provides business logic for user authentication and authorization.
 * Implements registration, login, token management, password reset, and 2FA.
 * Handles all authentication-related database operations.
 *
 * @module services/auth.service
 */

import bcrypt from 'bcryptjs';
import { getPrismaClient } from '@/config/database';
import { JWTUtil, TokenPair } from '@/utils/jwt';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  BadRequestError,
  ValidationError,
} from '@/utils/errors';
import logger from '@/utils/logger';
import { User, UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * User registration data transfer object
 */
export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * User login data transfer object
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * Password reset request DTO
 */
export interface PasswordResetRequestDTO {
  email: string;
}

/**
 * Password reset confirmation DTO
 */
export interface PasswordResetDTO {
  token: string;
  newPassword: string;
}

/**
 * Authentication Service Class
 */
export class AuthService {
  private prisma = getPrismaClient();
  private bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  /**
   * Registers a new user
   *
   * @param data - User registration data
   * @returns Created user and authentication tokens
   * @throws ConflictError if email or username already exists
   */
  async register(data: RegisterDTO): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }],
        },
      });

      if (existingUser) {
        if (existingUser.email === data.email.toLowerCase()) {
          throw new ConflictError('Email already registered');
        }
        throw new ConflictError('Username already taken');
      }

      // Validate password strength
      this.validatePassword(data.password);

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.bcryptRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username.toLowerCase(),
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: UserRole.USER,
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = JWTUtil.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      logger.error('Registration failed', error as Error);
      throw error;
    }
  }

  /**
   * Authenticates a user and returns tokens
   *
   * @param data - Login credentials
   * @param ipAddress - User's IP address
   * @returns User data and authentication tokens
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(
    data: LoginDTO,
    ipAddress?: string
  ): Promise<{ user: Partial<User>; tokens: TokenPair }> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (!user) {
        logger.security('Login attempt with non-existent email', { email: data.email });
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive || user.deletedAt) {
        logger.security('Login attempt for inactive account', { userId: user.id });
        throw new UnauthorizedError('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);

      if (!isPasswordValid) {
        logger.security('Login attempt with invalid password', { userId: user.id });
        throw new UnauthorizedError('Invalid credentials');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });

      // Generate tokens
      const tokens = JWTUtil.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.info('User logged in successfully', { userId: user.id });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
        },
        tokens,
      };
    } catch (error) {
      logger.error('Login failed', error as Error);
      throw error;
    }
  }

  /**
   * Refreshes access token using refresh token
   *
   * @param refreshToken - Valid refresh token
   * @returns New token pair
   * @throws UnauthorizedError if token is invalid or revoked
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.revokedAt) {
        logger.security('Attempt to use invalid/revoked refresh token', {
          userId: decoded.userId,
        });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (tokenRecord.expiresAt < new Date()) {
        logger.security('Attempt to use expired refresh token', { userId: decoded.userId });
        throw new UnauthorizedError('Refresh token expired');
      }

      // Check if user is still active
      if (!tokenRecord.user.isActive || tokenRecord.user.deletedAt) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Generate new tokens
      const tokens = JWTUtil.generateTokenPair({
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      });

      // Revoke old refresh token and store new one
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });

      await this.storeRefreshToken(tokenRecord.user.id, tokens.refreshToken);

      logger.info('Tokens refreshed successfully', { userId: tokenRecord.user.id });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', error as Error);
      throw error;
    }
  }

  /**
   * Logs out a user by revoking their refresh token
   *
   * @param refreshToken - Refresh token to revoke
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error as Error);
      throw error;
    }
  }

  /**
   * Initiates password reset process
   *
   * @param data - Password reset request data
   * @returns Reset token (in development) or void
   */
  async requestPasswordReset(data: PasswordResetRequestDTO): Promise<{ token?: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if email exists
        logger.security('Password reset requested for non-existent email', {
          email: data.email,
        });
        return {};
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store reset token
      await this.prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      logger.info('Password reset requested', { userId: user.id });

      // In development, return token for testing
      if (process.env.NODE_ENV === 'development') {
        return { token: resetToken };
      }

      // TODO: Send email with reset link
      return {};
    } catch (error) {
      logger.error('Password reset request failed', error as Error);
      throw error;
    }
  }

  /**
   * Resets user password using reset token
   *
   * @param data - Password reset data
   */
  async resetPassword(data: PasswordResetDTO): Promise<void> {
    try {
      const hashedToken = crypto.createHash('sha256').update(data.token).digest('hex');

      const resetRecord = await this.prisma.passwordReset.findUnique({
        where: { token: hashedToken },
        include: { user: true },
      });

      if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Validate new password
      this.validatePassword(data.newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, this.bcryptRounds);

      // Update password and mark token as used
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: resetRecord.userId },
          data: {
            password: hashedPassword,
            passwordChangedAt: new Date(),
          },
        }),
        this.prisma.passwordReset.update({
          where: { token: hashedToken },
          data: { usedAt: new Date() },
        }),
        // Revoke all refresh tokens for security
        this.prisma.refreshToken.updateMany({
          where: { userId: resetRecord.userId },
          data: { revokedAt: new Date() },
        }),
      ]);

      logger.info('Password reset successfully', { userId: resetRecord.userId });
    } catch (error) {
      logger.error('Password reset failed', error as Error);
      throw error;
    }
  }

  /**
   * Changes user password (authenticated)
   *
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', error as Error);
      throw error;
    }
  }

  /**
   * Validates password strength
   *
   * @param password - Password to validate
   * @throws ValidationError if password is weak
   */
  private validatePassword(password: string): void {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);

    if (password.length < minLength) {
      throw new ValidationError(`Password must be at least ${minLength} characters long`);
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&#]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new ValidationError(
        'Password must contain uppercase, lowercase, number, and special character'
      );
    }
  }

  /**
   * Stores refresh token in database
   *
   * @param userId - User ID
   * @param token - Refresh token
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expirationMs = this.parseExpiration(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + expirationMs),
      },
    });
  }

  /**
   * Parses expiration string to milliseconds
   *
   * @param expiration - Expiration string (e.g., "7d", "1h")
   * @returns Milliseconds
   */
  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
  }
}

export default new AuthService();
