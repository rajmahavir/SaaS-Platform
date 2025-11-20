/**
 * Express Server Application
 *
 * Main server file that bootstraps the Express application.
 * Configures middleware, routes, error handling, and starts the server.
 * Implements graceful shutdown and health checks.
 *
 * @module server
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { connectRedis, disconnectRedis } from '@/config/redis';
import logger from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { standardRateLimiter } from '@/middleware/rateLimiter';

// Routes
import authRoutes from '@/routes/auth.routes';
import taskRoutes from '@/routes/task.routes';

// Load environment variables
dotenv.config();

/**
 * Express Application Class
 */
class Server {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000', 10);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initializes Express middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      })
    );

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(standardRateLimiter);

    // Health check endpoint (before rate limiting)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        name: process.env.APP_NAME || 'TaskManager API',
        version: process.env.API_VERSION || 'v1',
        description: 'Task Management SaaS Platform API',
        documentation: `${process.env.API_URL}/api/v1/docs`,
      });
    });
  }

  /**
   * Initializes application routes
   */
  private initializeRoutes(): void {
    const apiVersion = process.env.API_VERSION || 'v1';
    const apiPrefix = `/api/${apiVersion}`;

    // Authentication routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);

    // Task management routes
    this.app.use(`${apiPrefix}/tasks`, taskRoutes);

    logger.info(`Routes initialized with prefix: ${apiPrefix}`);
  }

  /**
   * Initializes error handling middleware
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Connects to database and external services
   */
  private async connectServices(): Promise<void> {
    try {
      // Connect to PostgreSQL (only if DATABASE_URL is set)
      if (process.env.DATABASE_URL) {
        await connectDatabase();
        logger.info('Database connected');
      } else {
        logger.warn('DATABASE_URL not set - running without database');
      }

      // Connect to Redis (only if Redis config is set)
      if (process.env.REDIS_HOST) {
        await connectRedis();
        logger.info('Redis connected');
      } else {
        logger.warn('REDIS_HOST not set - running without Redis');
      }

      logger.info('Services initialization completed');
    } catch (error) {
      logger.error('Failed to connect services', error as Error);
      logger.warn('Continuing without full service connectivity');
      // Don't throw - allow server to start anyway
    }
  }

  /**
   * Starts the Express server
   */
  public async start(): Promise<void> {
    try {
      // Connect to services first
      await this.connectServices();

      // Start HTTP server
      const server = this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔗 API URL: ${process.env.API_URL || `http://localhost:${this.port}`}`);
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown(server);
    } catch (error) {
      logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  /**
   * Sets up graceful shutdown handlers
   */
  private setupGracefulShutdown(server: ReturnType<typeof this.app.listen>): void {
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          if (process.env.DATABASE_URL) {
            await disconnectDatabase();
          }

          // Close Redis connection
          if (process.env.REDIS_HOST) {
            await disconnectRedis();
          }

          logger.info('All connections closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error as Error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection', {
        reason,
        promise,
      });
      shutdown('UNHANDLED_REJECTION');
    });
  }
}

// Create and start server
const serverInstance = new Server();

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  serverInstance.start();
}

// Export app for testing
export default serverInstance.app;
