import { Pool, QueryResult } from 'pg';
import { query } from '../db';

const mockEnv = {
  DB_USER: 'testuser',
  DB_HOST: 'localhost',
  DB_NAME: 'testdb',
  DB_PASSWORD: 'testpass',
  DB_PORT: '5432'
};

const originalEnv = process.env;

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { 
    Pool: jest.fn(() => mPool)
  };
});

describe('Database Module', () => {
  let pool: jest.Mocked<Pool>;

  beforeAll(() => {
    process.env = { ...originalEnv, ...mockEnv };
    jest.resetModules();
    require('../db');
    pool = (Pool as unknown as jest.Mock).mock.results[0].value;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute a query without parameters', async () => {
    const mockResult: QueryResult = {
      rows: [{ id: 1, name: 'test' }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: []
    };

    (pool.query as jest.Mock).mockResolvedValueOnce(mockResult);

    const sql = 'SELECT * FROM test';
    const result = await query(sql);

    expect(pool.query).toHaveBeenCalledWith(sql, undefined);
    expect(result).toEqual(mockResult);
  });

  it('should execute a query with parameters', async () => {
    const mockResult: QueryResult = {
      rows: [{ id: 1, name: 'test' }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: []
    };

    (pool.query as jest.Mock).mockResolvedValueOnce(mockResult);

    const sql = 'SELECT * FROM test WHERE id = $1';
    const params = [1];
    const result = await query(sql, params);

    expect(pool.query).toHaveBeenCalledWith(sql, params);
    expect(result).toEqual(mockResult);
  });

  it('should handle query errors', async () => {
    const error = new Error('Database error');
    (pool.query as jest.Mock).mockRejectedValueOnce(error);

    const sql = 'SELECT * FROM test';
    await expect(query(sql)).rejects.toThrow('Database error');
  });

  describe('Pool Configuration', () => {
    it('should create pool with correct environment variables', () => {
      expect(Pool).toHaveBeenCalledWith({
        user: mockEnv.DB_USER,
        host: mockEnv.DB_HOST,
        database: mockEnv.DB_NAME,
        password: mockEnv.DB_PASSWORD,
        port: parseInt(mockEnv.DB_PORT),
      });
    });
  });
}); 