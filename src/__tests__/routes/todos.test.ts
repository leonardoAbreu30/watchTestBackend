import { FastifyInstance } from 'fastify';
import { query } from '../../db';
import { kafkaService } from '../../services/kafka.service';
import todosRoutes from '../../routes/todos';

jest.mock('../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../services/kafka.service', () => ({
  kafkaService: {
    publishTodoCreated: jest.fn(),
    publishTodoDeleted: jest.fn(),
  },
}));

describe('Todos Routes', () => {
  let app: FastifyInstance;
  const mockAuthenticate = jest.fn();
  const mockUser = { id: 1, username: 'testuser' };

  beforeAll(async () => {
    app = require('fastify')();
    app.decorate('authenticate', mockAuthenticate);
    await app.register(todosRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockImplementation(async (request: any) => {
      request.user = mockUser;
    });
  });

  describe('GET /todos', () => {
    it('should return user todos', async () => {
      const mockTodos = [
        { id: 1, text: 'Test todo 1', user_id: 1 },
        { id: 2, text: 'Test todo 2', user_id: 1 },
      ];
      (query as jest.Mock).mockResolvedValueOnce({ rows: mockTodos });

      const response = await app.inject({
        method: 'GET',
        url: '/todos',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockTodos);
      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
        [mockUser.id]
      );
    });

    it('should handle database errors', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await app.inject({
        method: 'GET',
        url: '/todos',
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /todos', () => {
    const newTodo = { text: 'New todo' };

    it('should create a new todo', async () => {
      const mockCreatedTodo = { id: 1, ...newTodo, user_id: mockUser.id };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCreatedTodo] });

      const response = await app.inject({
        method: 'POST',
        url: '/todos',
        payload: newTodo,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockCreatedTodo);
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO todos (text, user_id) VALUES ($1, $2) RETURNING *',
        [newTodo.text, mockUser.id]
      );
      expect(kafkaService.publishTodoCreated).toHaveBeenCalledWith(mockCreatedTodo, mockUser.id);
    });

    it('should handle database errors', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await app.inject({
        method: 'POST',
        url: '/todos',
        payload: newTodo,
      });

      expect(response.statusCode).toBe(500);
      expect(kafkaService.publishTodoCreated).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /todos/:id', () => {
    const todoId = '1';

    it('should delete a todo', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ user_id: mockUser.id }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'DELETE',
        url: `/todos/${todoId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ success: true });
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 AND user_id = $2',
        [todoId, mockUser.id]
      );
      expect(kafkaService.publishTodoDeleted).toHaveBeenCalledWith(parseInt(todoId), mockUser.id);
    });

    it('should return 404 if todo not found', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await app.inject({
        method: 'DELETE',
        url: `/todos/${todoId}`,
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ error: 'Todo not found' });
      expect(kafkaService.publishTodoDeleted).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not authorized', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ user_id: 999 }] });

      const response = await app.inject({
        method: 'DELETE',
        url: `/todos/${todoId}`,
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.payload)).toEqual({ error: 'Not authorized to delete this todo' });
      expect(kafkaService.publishTodoDeleted).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await app.inject({
        method: 'DELETE',
        url: `/todos/${todoId}`,
      });

      expect(response.statusCode).toBe(500);
      expect(kafkaService.publishTodoDeleted).not.toHaveBeenCalled();
    });
  });
}); 