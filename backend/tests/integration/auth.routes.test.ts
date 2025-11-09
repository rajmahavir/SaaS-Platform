/**
 * Authentication Routes Integration Tests
 *
 * End-to-end tests for authentication API endpoints.
 */

import request from 'supertest';
import app from '../../src/server';
import { getPrismaClient } from '../../src/config/database';

describe('Auth Routes Integration Tests', () => {
  const prisma = getPrismaClient();

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'integration@test.com',
          username: 'integrationuser',
          password: 'Test123!@#',
          firstName: 'Integration',
          lastName: 'Test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        username: 'duplicate1',
        password: 'Test123!@#',
      };

      await request(app).post('/api/v1/auth/register').send(userData);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...userData, username: 'duplicate2' });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'login@test.com',
        username: 'logintest',
        password: 'Test123!@#',
      });
    });

    it('should login successfully', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'login@test.com',
        password: 'Test123!@#',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'login@test.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  });
});
