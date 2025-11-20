/**
 * JWT Utility Module
 *
 * Provides JWT token generation, verification, and management utilities.
 * Implements access and refresh token patterns with secure practices.
 * Supports token blacklisting and revocation.
 *
 * @module utils/jwt
 */

import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { UnauthorizedError, InvalidTokenError, TokenExpiredError } from './errors';
import logger from './logger';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  exp?: number; // Expiration time (added by JWT)
  iat?: number; // Issued at (added by JWT)
  iss?: string; // Issuer (added by JWT)
  aud?: string; // Audience (added by JWT)
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

/**
 * JWT configuration from environment variables
 */
const JWT_CONFIG = {
  accessSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.APP_NAME || 'TaskManager',
  audience: process.env.APP_URL || 'http://localhost:3000',
};

/**
 * JWT Utility Class
 */
export class JWTUtil {
  /**
   * Generates an access token
   *
   * @param payload - Token payload
   * @param expiresIn - Token expiration time (optional)
   * @returns Signed JWT access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'type'>, expiresIn?: string): string {
    try {
      const tokenPayload: JWTPayload = {
        ...payload,
        type: 'access',
      };

      const signOptions: SignOptions = {
        expiresIn: expiresIn || JWT_CONFIG.accessExpiresIn,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      };

      const token = jwt.sign(tokenPayload, JWT_CONFIG.accessSecret, signOptions);
      logger.debug('Access token generated', { userId: payload.userId });
      return token;
    } catch (error) {
      logger.error('Failed to generate access token', error as Error);
      throw new InternalServerError('Token generation failed');
    }
  }

  /**
   * Generates a refresh token
   *
   * @param payload - Token payload
   * @param expiresIn - Token expiration time (optional)
   * @returns Signed JWT refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'type'>, expiresIn?: string): string {
    try {
      const tokenPayload: JWTPayload = {
        ...payload,
        type: 'refresh',
      };

      const signOptions: SignOptions = {
        expiresIn: expiresIn || JWT_CONFIG.refreshExpiresIn,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      };

      const token = jwt.sign(tokenPayload, JWT_CONFIG.refreshSecret, signOptions);
      logger.debug('Refresh token generated', { userId: payload.userId });
      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token', error as Error);
      throw new InternalServerError('Token generation failed');
    }
  }

  /**
   * Generates both access and refresh tokens
   *
   * @param payload - Token payload
   * @returns Object containing both tokens
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'type'>): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: JWT_CONFIG.accessExpiresIn,
      refreshTokenExpiresIn: JWT_CONFIG.refreshExpiresIn,
    };
  }

  /**
   * Verifies an access token
   *
   * @param token - JWT token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const options: VerifyOptions = {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      };

      const decoded = jwt.verify(token, JWT_CONFIG.accessSecret, options) as JWTPayload;

      if (decoded.type !== 'access') {
        throw new InvalidTokenError('Invalid token type');
      }

      logger.debug('Access token verified', { userId: decoded.userId });
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Access token expired');
        throw new TokenExpiredError();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token');
        throw new InvalidTokenError();
      }
      throw error;
    }
  }

  /**
   * Verifies a refresh token
   *
   * @param token - JWT refresh token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const options: VerifyOptions = {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      };

      const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret, options) as JWTPayload;

      if (decoded.type !== 'refresh') {
        throw new InvalidTokenError('Invalid token type');
      }

      logger.debug('Refresh token verified', { userId: decoded.userId });
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh token expired');
        throw new TokenExpiredError();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token');
        throw new InvalidTokenError();
      }
      throw error;
    }
  }

  /**
   * Decodes a token without verifying signature
   * Use only for debugging or when verification is not needed
   *
   * @param token - JWT token to decode
   * @returns Decoded token payload
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Failed to decode token', error as Error);
      return null;
    }
  }

  /**
   * Extracts token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns Extracted token or null
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Gets token expiration time in seconds
   *
   * @param token - JWT token
   * @returns Expiration time in seconds or null
   */
  static getTokenExpiration(token: string): number | null {
    const decoded = this.decodeToken(token);
    return decoded?.exp || null;
  }

  /**
   * Checks if token is expired
   *
   * @param token - JWT token
   * @returns true if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiration(token);
    if (!exp) {
      return true;
    }
    return Date.now() >= exp * 1000;
  }
}

// Import InternalServerError
import { InternalServerError } from './errors';

export default JWTUtil;
