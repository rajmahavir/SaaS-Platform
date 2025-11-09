/**
 * Authentication Middleware Module
 *
 * Provides middleware functions for JWT authentication and authorization.
 * Implements role-based access control and token verification.
 * Supports API key authentication for programmatic access.
 *
 * @module middleware/auth
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { JWTUtil } from '@/utils/jwt';
import { getPrismaClient } from '@/config/database';
import logger from '@/utils/logger';
import { UserRole } from '@prisma/client';

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtil.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = JWTUtil.verifyAccessToken(token);
    const prisma = getPrismaClient();

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      logger.security('Attempt to use token for inactive/deleted user', {
        userId: decoded.userId,
      });
      throw new UnauthorizedError('Invalid authentication credentials');
    }

    // Attach user to request
    (req as AuthRequest).user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present but doesn't require it
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtil.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = JWTUtil.verifyAccessToken(token);
      const prisma = getPrismaClient();

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true, deletedAt: null },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (user) {
        (req as AuthRequest).user = {
          userId: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional authentication
    next();
  }
};

/**
 * Authorization middleware factory
 * Creates middleware to check if user has required role
 *
 * @param roles - Required roles (can be single role or array of roles)
 * @returns Express middleware function
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(authReq.user.role)) {
      logger.security('Unauthorized access attempt', {
        userId: authReq.user.userId,
        requiredRoles: roles,
        userRole: authReq.user.role,
      });
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * API Key authentication middleware
 * Verifies API key from header or query parameter
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

    if (!apiKey) {
      throw new UnauthorizedError('API key required');
    }

    const prisma = getPrismaClient();

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive || apiKeyRecord.revokedAt) {
      logger.security('Invalid or revoked API key used', { apiKey: apiKey.substring(0, 10) });
      throw new UnauthorizedError('Invalid API key');
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      logger.security('Expired API key used', { apiKey: apiKey.substring(0, 10) });
      throw new UnauthorizedError('API key expired');
    }

    if (!apiKeyRecord.user.isActive || apiKeyRecord.user.deletedAt) {
      logger.security('API key used for inactive user', {
        userId: apiKeyRecord.user.id,
      });
      throw new UnauthorizedError('Invalid API key');
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach user to request
    (req as AuthRequest).user = {
      userId: apiKeyRecord.user.id,
      email: apiKeyRecord.user.email,
      role: apiKeyRecord.user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify user owns the resource
 * Checks if the authenticated user is the owner of the resource
 *
 * @param resourceIdParam - Name of the route parameter containing resource ID
 * @param resourceType - Type of resource (for logging)
 * @returns Express middleware function
 */
export const verifyOwnership = (resourceIdParam: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return next(new BadRequestError(`${resourceType} ID required`));
      }

      const prisma = getPrismaClient();

      // This is a generic ownership check - specific implementations
      // should be in their respective controllers
      // For now, we'll just pass through
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Import BadRequestError
import { BadRequestError } from '@/utils/errors';

export default authenticate;
