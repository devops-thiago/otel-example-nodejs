/**
 * Unit Tests for User Repository
 * Uses mocked database connection
 */

// Mock the database module before requiring anything
jest.mock('../../src/database', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../src/metrics', () => ({
  recordDbQuery: jest.fn(),
}));

const { getPool } = require('../../src/database');
const userRepository = require('../../src/repositories/userRepository');

describe('User Repository Unit Tests', () => {
  let mockPool;
  let mockQuery;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock query function
    mockQuery = jest.fn();

    // Create mock pool
    mockPool = {
      query: mockQuery,
    };

    // Setup getPool to return mock pool
    getPool.mockReturnValue(mockPool);
  });

  describe('findAll', () => {
    it('should return all users with pagination', async () => {
      const mockUsers = [
        { id: 1, name: 'User 1', email: 'user1@test.com', age: 25 },
        { id: 2, name: 'User 2', email: 'user2@test.com', age: 30 },
      ];

      mockQuery.mockResolvedValue([mockUsers]);

      const result = await userRepository.findAll(10, 0);

      expect(result).toEqual(mockUsers);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [10, 0]);
    });

    it('should handle query errors', async () => {
      const error = new Error('Database error');
      mockQuery.mockRejectedValue(error);

      await expect(userRepository.findAll(10, 0)).rejects.toThrow('Database error');
    });

    it('should use default pagination values', async () => {
      mockQuery.mockResolvedValue([[]]);

      await userRepository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [100, 0]);
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@test.com', age: 25 };
      mockQuery.mockResolvedValue([[mockUser]]);

      const result = await userRepository.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'), [1]);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue([[]]);

      const result = await userRepository.findById(999);

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));

      await expect(userRepository.findById(1)).rejects.toThrow('Connection lost');
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = { id: 1, name: 'Test', email: 'test@test.com' };
      mockQuery.mockResolvedValue([[mockUser]]);

      const result = await userRepository.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE email = ?'), [
        'test@test.com',
      ]);
    });

    it('should return null when email not found', async () => {
      mockQuery.mockResolvedValue([[]]);

      const result = await userRepository.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = { name: 'New User', email: 'new@test.com', age: 28 };
      const mockInsertResult = { insertId: 5 };
      const mockCreatedUser = { id: 5, ...userData };

      mockQuery
        .mockResolvedValueOnce([mockInsertResult]) // INSERT
        .mockResolvedValueOnce([[mockCreatedUser]]); // SELECT (findById)

      const result = await userRepository.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('INSERT INTO users'), [
        'New User',
        'new@test.com',
        28,
      ]);
    });

    it('should handle creation errors', async () => {
      const userData = { name: 'Test', email: 'test@test.com', age: 25 };
      mockQuery.mockRejectedValue(new Error('Duplicate entry'));

      await expect(userRepository.create(userData)).rejects.toThrow('Duplicate entry');
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const userData = { name: 'Updated', email: 'updated@test.com', age: 30 };
      const mockUpdateResult = { affectedRows: 1 };
      const mockUpdatedUser = { id: 1, ...userData };

      mockQuery
        .mockResolvedValueOnce([mockUpdateResult]) // UPDATE
        .mockResolvedValueOnce([[mockUpdatedUser]]); // SELECT (findById)

      const result = await userRepository.update(1, userData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('UPDATE users'), [
        'Updated',
        'updated@test.com',
        30,
        1,
      ]);
    });

    it('should return null when user not found', async () => {
      const userData = { name: 'Test', email: 'test@test.com', age: 25 };
      mockQuery.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await userRepository.update(999, userData);

      expect(result).toBeNull();
    });

    it('should handle update errors', async () => {
      const userData = { name: 'Test', email: 'test@test.com', age: 25 };
      mockQuery.mockRejectedValue(new Error('Update failed'));

      await expect(userRepository.update(1, userData)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await userRepository.delete(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'), [1]);
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await userRepository.delete(999);

      expect(result).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockQuery.mockRejectedValue(new Error('Delete failed'));

      await expect(userRepository.delete(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('count', () => {
    it('should return total count of users', async () => {
      mockQuery.mockResolvedValue([[{ count: 42 }]]);

      const result = await userRepository.count();

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'));
    });

    it('should handle count errors', async () => {
      mockQuery.mockRejectedValue(new Error('Count failed'));

      await expect(userRepository.count()).rejects.toThrow('Count failed');
    });

    it('should return 0 when no users exist', async () => {
      mockQuery.mockResolvedValue([[{ count: 0 }]]);

      const result = await userRepository.count();

      expect(result).toBe(0);
    });
  });
});
