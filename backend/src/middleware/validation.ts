/**
 * Validation Middleware Module
 *
 * Provides request validation middleware using express-validator.
 * Implements validation rules for common scenarios and custom validators.
 * Handles validation errors and provides detailed error messages.
 *
 * @module middleware/validation
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '@/utils/errors';

/**
 * Validation result handler
 * Checks for validation errors and throws ValidationError if any exist
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : undefined,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
};

/**
 * Creates a validation chain with error handling
 * Wraps ValidationChain array to automatically handle validation results
 *
 * @param validations - Array of validation chains
 * @returns Middleware functions array
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return [...validations, validate];
};

/**
 * Custom validators
 */
export const customValidators = {
  /**
   * Validates if value is a valid UUID
   */
  isUUID: (value: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Validates if value is a strong password
   * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
   */
  isStrongPassword: (value: string): boolean => {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return strongPasswordRegex.test(value);
  },

  /**
   * Validates if date is in the future
   */
  isFutureDate: (value: string): boolean => {
    const date = new Date(value);
    return date > new Date();
  },

  /**
   * Validates if date is not in the past
   */
  isNotPastDate: (value: string): boolean => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  },

  /**
   * Validates if value is a valid hex color
   */
  isHexColor: (value: string): boolean => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(value);
  },

  /**
   * Validates if value is a valid URL
   */
  isValidUrl: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validates if value is within min and max length
   */
  isWithinLength: (value: string, min: number, max: number): boolean => {
    return value.length >= min && value.length <= max;
  },

  /**
   * Validates if array has minimum length
   */
  hasMinArrayLength: (value: unknown[], min: number): boolean => {
    return Array.isArray(value) && value.length >= min;
  },

  /**
   * Validates if array has maximum length
   */
  hasMaxArrayLength: (value: unknown[], max: number): boolean => {
    return Array.isArray(value) && value.length <= max;
  },
};

/**
 * Sanitization helpers
 */
export const sanitizers = {
  /**
   * Trims whitespace and converts to lowercase
   */
  normalizeEmail: (email: string): string => {
    return email.trim().toLowerCase();
  },

  /**
   * Removes all whitespace
   */
  removeWhitespace: (value: string): string => {
    return value.replace(/\s/g, '');
  },

  /**
   * Escapes HTML characters
   */
  escapeHtml: (value: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return value.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
  },

  /**
   * Strips HTML tags
   */
  stripHtmlTags: (value: string): string => {
    return value.replace(/<[^>]*>/g, '');
  },
};

export default validate;
