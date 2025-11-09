/**
 * Task Controller Module
 *
 * Handles HTTP requests for task management endpoints.
 * Implements CRUD operations with validation and authorization.
 *
 * @module controllers/task.controller
 */

import { Response } from 'express';
import taskService from '@/services/task.service';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthRequest } from '@/middleware/auth';
import { StatusCodes } from 'http-status-codes';
import { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * Task Controller Class
 */
export class TaskController {
  /**
   * Create a new task
   * POST /api/v1/tasks
   */
  createTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const task = await taskService.createTask(userId, req.body);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Task created successfully',
      data: { task },
    });
  });

  /**
   * Get task by ID
   * GET /api/v1/tasks/:id
   */
  getTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const taskId = req.params.id;

    const task = await taskService.getTaskById(userId, taskId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { task },
    });
  });

  /**
   * Get all tasks with filters
   * GET /api/v1/tasks
   */
  getTasks = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const filters = {
      projectId: req.query.projectId as string,
      assigneeId: req.query.assigneeId as string,
      status: req.query.status as TaskStatus,
      priority: req.query.priority as TaskPriority,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      dueDateFrom: req.query.dueDateFrom ? new Date(req.query.dueDateFrom as string) : undefined,
      dueDateTo: req.query.dueDateTo ? new Date(req.query.dueDateTo as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await taskService.getTasks(userId, filters);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  });

  /**
   * Update task
   * PATCH /api/v1/tasks/:id
   */
  updateTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const taskId = req.params.id;

    const task = await taskService.updateTask(userId, taskId, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    });
  });

  /**
   * Delete task
   * DELETE /api/v1/tasks/:id
   */
  deleteTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const taskId = req.params.id;

    await taskService.deleteTask(userId, taskId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Task deleted successfully',
    });
  });
}

export default new TaskController();
