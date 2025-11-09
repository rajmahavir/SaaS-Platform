/**
 * Authentication Routes Module
 *
 * Defines all authentication-related routes.
 * Includes validation and rate limiting.
 *
 * @module routes/auth.routes
 */

import { Router } from 'express';
import { body } from 'express-validator';
import authController from '@/controllers/auth.controller';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import {
  authRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '@/middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  registerRateLimiter,
  validateRequest([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and alphanumeric'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      .withMessage(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      ),
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
  ]),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  validateRequest([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  authController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validateRequest([body('refreshToken').notEmpty().withMessage('Refresh token is required')]),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post(
  '/logout',
  validateRequest([body('refreshToken').notEmpty().withMessage('Refresh token is required')]),
  authController.logout
);

/**
 * @route   POST /api/v1/auth/password-reset/request
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/password-reset/request',
  passwordResetRateLimiter,
  validateRequest([body('email').isEmail().normalizeEmail().withMessage('Valid email is required')]),
  authController.requestPasswordReset
);

/**
 * @route   POST /api/v1/auth/password-reset/confirm
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/password-reset/confirm',
  validateRequest([
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      .withMessage('Password must meet strength requirements'),
  ]),
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/password/change
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  '/password/change',
  authenticate,
  validateRequest([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
      .withMessage('Password must meet strength requirements'),
  ]),
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

export default router;
