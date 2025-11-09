/**
 * Task Routes Module
 *
 * Defines all task management routes.
 * Includes validation and authorization.
 *
 * @module routes/task.routes
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import taskController from '@/controllers/task.controller';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';

const router = Router();

// All task routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  '/',
  validateRequest([
    body('title').notEmpty().isLength({ min: 1, max: 255 }).trim().withMessage('Title is required'),
    body('description').optional().isString().trim(),
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('assigneeId').optional().isUUID().withMessage('Valid assignee ID required'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional().isISO8601().toDate(),
    body('startDate').optional().isISO8601().toDate(),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('tags').optional().isArray(),
    body('parentId').optional().isUUID(),
  ]),
  taskController.createTask
);

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks with filters
 * @access  Private
 */
router.get(
  '/',
  validateRequest([
    query('projectId').optional().isUUID(),
    query('assigneeId').optional().isUUID(),
    query('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED']),
    query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  taskController.getTasks
);

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get task by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest([param('id').isUUID().withMessage('Valid task ID is required')]),
  taskController.getTask
);

/**
 * @route   PATCH /api/v1/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.patch(
  '/:id',
  validateRequest([
    param('id').isUUID().withMessage('Valid task ID is required'),
    body('title').optional().isLength({ min: 1, max: 255 }).trim(),
    body('description').optional().isString().trim(),
    body('assigneeId').optional().isUUID(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional().isISO8601().toDate(),
    body('startDate').optional().isISO8601().toDate(),
    body('completedAt').optional().isISO8601().toDate(),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('actualHours').optional().isFloat({ min: 0 }),
    body('tags').optional().isArray(),
    body('position').optional().isInt({ min: 0 }),
  ]),
  taskController.updateTask
);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete task
 * @access  Private
 */
router.delete(
  '/:id',
  validateRequest([param('id').isUUID().withMessage('Valid task ID is required')]),
  taskController.deleteTask
);

export default router;
