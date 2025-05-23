import { AuthService } from '../../services/auth.service';
import * as db from '../../db';
import bcrypt from 'bcrypt';

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockUserInput = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully register a new user', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpassword');
      
      const mockUser = {
        id: 1,
        username: mockUserInput.username,
        email: mockUserInput.email,
        name: mockUserInput.name,
        created_at: new Date(),
        updated_at: new Date(),
      };
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.register(mockUserInput);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserInput.password, 10);
    });

    it('should throw error if user already exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(authService.register(mockUserInput)).rejects.toThrow('User already exists');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const mockCredentials = {
      usernameOrEmail: 'testuser',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await authService.login(mockCredentials.usernameOrEmail, mockCredentials.password);

      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        name: mockUser.name,
      }));
      expect(result).not.toHaveProperty('password_hash');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(mockCredentials.password, 'hashedpassword');
    });

    it('should throw error if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(authService.login(mockCredentials.usernameOrEmail, mockCredentials.password))
        .rejects.toThrow('Invalid credentials');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: 'hashedpassword',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(authService.login(mockCredentials.usernameOrEmail, mockCredentials.password))
        .rejects.toThrow('Invalid credentials');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });
  });
}); 