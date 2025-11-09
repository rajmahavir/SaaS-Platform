/**
 * Authentication Controller Module
 *
 * Handles HTTP requests for authentication endpoints.
 * Implements request validation, response formatting, and error handling.
 *
 * @module controllers/auth.controller
 */

import { Request, Response, NextFunction } from 'express';
import authService from '@/services/auth.service';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthRequest } from '@/middleware/auth';
import { StatusCodes } from 'http-status-codes';

/**
 * Authentication Controller Class
 */
export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { user, tokens } = await authService.register(req.body);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        tokens,
      },
    });
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const ipAddress = req.ip;
    const { user, tokens } = await authService.login(req.body, ipAddress);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens,
      },
    });
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    });
  });

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Request password reset
   * POST /api/v1/auth/password-reset/request
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.requestPasswordReset(req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password reset email sent',
      ...(process.env.NODE_ENV === 'development' && { data: result }),
    });
  });

  /**
   * Reset password
   * POST /api/v1/auth/password-reset/confirm
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.resetPassword(req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password reset successful',
    });
  });

  /**
   * Change password (authenticated)
   * POST /api/v1/auth/password/change
   */
  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  });
}

export default new AuthController();
