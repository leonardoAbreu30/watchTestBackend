import { FastifyInstance } from 'fastify';
import { authRoutes } from '../../routes/auth.routes';
import { AuthService } from '../../services/auth.service';

jest.mock('../../services/auth.service', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => ({
      register: jest.fn(),
      login: jest.fn(),
    })),
  };
});

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let mockAuthService: jest.Mocked<AuthService>;
  const mockAuthenticate = jest.fn();

  beforeAll(async () => {
    app = require('fastify')();
    
    // Setup JWT
    await app.register(require('@fastify/jwt'), {
      secret: 'test-secret',
    });
    
    // Setup authentication decorator
    app.decorate('authenticate', mockAuthenticate);
    
    // Register routes
    await app.register(authRoutes);
    
    // Get instance of mocked AuthService
    mockAuthService = (AuthService as jest.Mock).mock.results[0].value;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    const registerPayload = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user and return token', async () => {
      const mockUser = {
        id: 1,
        username: registerPayload.username,
        email: registerPayload.email,
        name: registerPayload.name,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.register.mockResolvedValueOnce(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/register',
        payload: registerPayload,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
      expect(mockAuthService.register).toHaveBeenCalledWith(registerPayload);
    });

    it('should return 400 if user already exists', async () => {
      mockAuthService.register.mockRejectedValueOnce(new Error('User already exists'));

      const response = await app.inject({
        method: 'POST',
        url: '/register',
        payload: registerPayload,
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload)).toEqual({ error: 'User already exists' });
    });
  });

  describe('POST /login', () => {
    const loginPayload = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };

    it('should login user and return token', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockAuthService.login.mockResolvedValueOnce(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/login',
        payload: loginPayload,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginPayload.usernameOrEmail,
        loginPayload.password
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      const response = await app.inject({
        method: 'POST',
        url: '/login',
        payload: loginPayload,
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.payload)).toEqual({ error: 'Invalid credentials' });
    });
  });

  describe('GET /me', () => {
    it('should return user data for authenticated request', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockAuthenticate.mockImplementationOnce(async (request: any) => {
        request.user = mockUser;
      });

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockUser);
    });

    it('should handle unauthenticated request', async () => {
      mockAuthenticate.mockRejectedValueOnce(new Error('Unauthorized'));

      const response = await app.inject({
        method: 'GET',
        url: '/me',
      });

      expect(response.statusCode).toBe(500); // Fastify converts unhandled errors to 500
    });
  });
}); 