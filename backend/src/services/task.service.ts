/**
 * Task Service Module
 *
 * Provides business logic for task management operations.
 * Implements CRUD operations, filtering, searching, and task relationships.
 * Handles task assignments, status updates, and notifications.
 *
 * @module services/task.service
 */

import { getPrismaClient } from '@/config/database';
import { cache } from '@/config/redis';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ValidationError,
} from '@/utils/errors';
import logger from '@/utils/logger';
import { Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client';

/**
 * Create task DTO
 */
export interface CreateTaskDTO {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  parentId?: string;
}

/**
 * Update task DTO
 */
export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  position?: number;
}

/**
 * Task filter options
 */
export interface TaskFilterOptions {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Task Service Class
 */
export class TaskService {
  private prisma = getPrismaClient();
  private cachePrefix = 'task:';
  private cacheTTL = 300; // 5 minutes

  /**
   * Creates a new task
   *
   * @param userId - User creating the task
   * @param data - Task creation data
   * @returns Created task
   */
  async createTask(userId: string, data: CreateTaskDTO): Promise<Task> {
    try {
      // Verify project exists and user has access
      await this.verifyProjectAccess(userId, data.projectId);

      // Verify assignee exists if provided
      if (data.assigneeId) {
        await this.verifyUser(data.assigneeId);
      }

      // Verify parent task exists if provided
      if (data.parentId) {
        await this.verifyTaskExists(data.parentId);
      }

      // Validate dates
      this.validateTaskDates(data.startDate, data.dueDate);

      // Create task
      const task = await this.prisma.task.create({
        data: {
          ...data,
          creatorId: userId,
          status: data.status || TaskStatus.TODO,
          priority: data.priority || TaskPriority.MEDIUM,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Invalidate cache
      await this.invalidateTaskCache(data.projectId);

      logger.info('Task created', { taskId: task.id, userId });

      return task;
    } catch (error) {
      logger.error('Failed to create task', error as Error);
      throw error;
    }
  }

  /**
   * Retrieves a task by ID
   *
   * @param userId - User requesting the task
   * @param taskId - Task ID
   * @returns Task with relationships
   */
  async getTaskById(userId: string, taskId: string): Promise<Task> {
    try {
      // Try cache first
      const cacheKey = `${this.cachePrefix}${taskId}`;
      const cached = await cache.get<Task>(cacheKey);

      if (cached) {
        return cached;
      }

      const task = await this.prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          labels: {
            include: {
              label: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              url: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Verify access
      await this.verifyProjectAccess(userId, task.projectId);

      // Cache task
      await cache.set(cacheKey, task, this.cacheTTL);

      return task;
    } catch (error) {
      logger.error('Failed to get task', error as Error);
      throw error;
    }
  }

  /**
   * Retrieves tasks with filtering and pagination
   *
   * @param userId - User requesting tasks
   * @param filters - Filter options
   * @returns Paginated tasks
   */
  async getTasks(
    userId: string,
    filters: TaskFilterOptions
  ): Promise<{ tasks: Task[]; total: number; page: number; pages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.TaskWhereInput = {
        deletedAt: null,
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
        ...(filters.tags &&
          filters.tags.length > 0 && {
            tags: { hasSome: filters.tags },
          }),
        ...(filters.dueDateFrom || filters.dueDateTo
          ? {
              dueDate: {
                ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
                ...(filters.dueDateTo && { lte: filters.dueDateTo }),
              },
            }
          : {}),
      });

      // Build orderBy
      const orderBy: Prisma.TaskOrderByWithRelationInput = filters.sortBy
        ? { [filters.sortBy]: filters.sortOrder || 'asc' }
        : { createdAt: 'desc' };

      // Execute queries
      const [tasks, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            assignee: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            labels: {
              include: {
                label: true,
              },
            },
          },
        }),
        this.prisma.task.count({ where }),
      ]);

      const pages = Math.ceil(total / limit);

      return { tasks, total, page, pages };
    } catch (error) {
      logger.error('Failed to get tasks', error as Error);
      throw error;
    }
  }

  /**
   * Updates a task
   *
   * @param userId - User updating the task
   * @param taskId - Task ID
   * @param data - Update data
   * @returns Updated task
   */
  async updateTask(userId: string, taskId: string, data: UpdateTaskDTO): Promise<Task> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Verify access
      await this.verifyProjectAccess(userId, task.projectId);

      // Validate dates if being updated
      if (data.startDate !== undefined || data.dueDate !== undefined) {
        this.validateTaskDates(
          data.startDate !== undefined ? data.startDate : task.startDate,
          data.dueDate !== undefined ? data.dueDate : task.dueDate
        );
      }

      // If marking as completed, set completedAt
      if (data.status === TaskStatus.COMPLETED && !task.completedAt) {
        data.completedAt = new Date();
      }

      // Update task
      const updatedTask = await this.prisma.task.update({
        where: { id: taskId },
        data,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          assignee: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Invalidate cache
      await cache.delete(`${this.cachePrefix}${taskId}`);
      await this.invalidateTaskCache(task.projectId);

      logger.info('Task updated', { taskId, userId });

      return updatedTask;
    } catch (error) {
      logger.error('Failed to update task', error as Error);
      throw error;
    }
  }

  /**
   * Deletes a task (soft delete)
   *
   * @param userId - User deleting the task
   * @param taskId - Task ID
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      // Verify access
      await this.verifyProjectAccess(userId, task.projectId);

      // Soft delete
      await this.prisma.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      // Invalidate cache
      await cache.delete(`${this.cachePrefix}${taskId}`);
      await this.invalidateTaskCache(task.projectId);

      logger.info('Task deleted', { taskId, userId });
    } catch (error) {
      logger.error('Failed to delete task', error as Error);
      throw error;
    }
  }

  /**
   * Verifies user has access to project
   */
  private async verifyProjectAccess(userId: string, projectId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        userId,
        projectId,
      },
    });

    if (!membership) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { creatorId: true },
      });

      if (!project || project.creatorId !== userId) {
        throw new ForbiddenError('Access denied to this project');
      }
    }
  }

  /**
   * Verifies user exists
   */
  private async verifyUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }
  }

  /**
   * Verifies task exists
   */
  private async verifyTaskExists(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundError('Parent task not found');
    }
  }

  /**
   * Validates task dates
   */
  private validateTaskDates(startDate?: Date | null, dueDate?: Date | null): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ValidationError('Start date cannot be after due date');
    }
  }

  /**
   * Invalidates task cache for a project
   */
  private async invalidateTaskCache(projectId: string): Promise<void> {
    await cache.deletePattern(`${this.cachePrefix}project:${projectId}:*`);
  }
}

export default new TaskService();
