import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { kafkaService } from '../../services/kafka.service';
import bcrypt from 'bcrypt';

describe('Application Integration Tests', () => {
  let app: FastifyInstance;
  let pool: Pool;
  let testUser: { id: number; token: string };

  beforeAll(async () => {
    // Create database connection
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'watchTest',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

    // Initialize app
    app = require('fastify')();

    // Register JWT
    await app.register(require('@fastify/jwt'), {
      secret: process.env.JWT_SECRET || 'test-secret'
    });

    // Register CORS
    await app.register(require('@fastify/cors'));

    // Register authentication decorator
    app.decorate('authenticate', async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // Register routes
    await app.register(require('../../routes/auth.routes').authRoutes);
    await app.register(require('../../routes/todos').default);

    // Connect to Kafka
    await kafkaService.connect();

    // Clean up database
    await pool.query('DELETE FROM todos');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM todos');
    await pool.query('DELETE FROM users');
    await pool.end();
    await kafkaService.disconnect();
    await app.close();
  });

  describe('Authentication Flow', () => {
    const testUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/register',
        payload: testUserData
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.user).toMatchObject({
        username: testUserData.username,
        email: testUserData.email,
        name: testUserData.name
      });
      expect(result.token).toBeDefined();

      // Save user data for subsequent tests
      testUser = {
        id: result.user.id,
        token: result.token
      };
    });

    it('should not register duplicate user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/register',
        payload: testUserData
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({
        error: 'User already exists'
      });
    });

    it('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/login',
        payload: {
          usernameOrEmail: testUserData.email,
          password: testUserData.password
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.user.email).toBe(testUserData.email);
      expect(result.token).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/login',
        payload: {
          usernameOrEmail: testUserData.email,
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Invalid credentials'
      });
    });
  });

  describe('Todo Operations', () => {
    let todoId: number;

    it('should create a new todo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/todos',
        headers: {
          Authorization: `Bearer ${testUser.token}`
        },
        payload: {
          text: 'Test todo'
        }
      });

      expect(response.statusCode).toBe(200);
      const todo = JSON.parse(response.payload);
      expect(todo.text).toBe('Test todo');
      expect(todo.user_id).toBe(testUser.id);
      todoId = todo.id;
    });

    it('should list user todos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/todos',
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const todos = JSON.parse(response.payload);
      expect(Array.isArray(todos)).toBe(true);
      expect(todos.length).toBeGreaterThan(0);
      expect(todos[0].user_id).toBe(testUser.id);
    });

    it('should delete a todo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/todos/${todoId}`,
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        success: true
      });
    });

    it('should not access todos without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/todos'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should not delete non-existent todo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/todos/999999',
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const user = JSON.parse(response.payload);
      expect(user.id).toBe(testUser.id);
    });

    it('should not access protected route without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/me'
      });

      expect(response.statusCode).toBe(401);
    });
  });
}); 