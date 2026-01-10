/**
 * Unit tests for Database Module
 */

// Mock mysql2/promise before requiring database
const mockPool = {
  getConnection: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
};

const mockConnection = {
  ping: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
  threadId: 12345,
};

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool),
}));

jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Database Module', () => {
  let database;
  let mysql;
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset mock implementations
    mockPool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.ping.mockResolvedValue(undefined);
    mockConnection.query.mockResolvedValue([]);
    mockConnection.release.mockReturnValue(undefined);
    mockPool.end.mockResolvedValue(undefined);

    mysql = require('mysql2/promise');
    logger = require('../../src/logger');
    database = require('../../src/database');
  });

  describe('getPool', () => {
    it('should create and return a connection pool', () => {
      const pool = database.getPool();

      expect(pool).toBeDefined();
      expect(mysql.createPool).toHaveBeenCalled();
    });

    it('should return existing pool on subsequent calls', () => {
      const pool1 = database.getPool();
      const pool2 = database.getPool();
      const pool3 = database.getPool();

      expect(pool1).toBe(pool2);
      expect(pool2).toBe(pool3);
      expect(mysql.createPool).toHaveBeenCalledTimes(1);
    });

    it('should create pool with correct configuration', () => {
      database.getPool();

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          user: expect.any(String),
          password: expect.any(String),
          database: expect.any(String),
          connectionLimit: expect.any(Number),
        })
      );
    });

    it('should enable keep alive', () => {
      database.getPool();

      expect(mysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        })
      );
    });

    it('should log pool creation', () => {
      database.getPool();

      expect(logger.info).toHaveBeenCalledWith(
        'Creating database connection pool',
        expect.any(Object)
      );
    });

    it('should register connection event handler', () => {
      database.getPool();

      expect(mockPool.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should register acquire event handler', () => {
      database.getPool();

      expect(mockPool.on).toHaveBeenCalledWith('acquire', expect.any(Function));
    });

    it('should register release event handler', () => {
      database.getPool();

      expect(mockPool.on).toHaveBeenCalledWith('release', expect.any(Function));
    });
  });

  describe('testConnection', () => {
    it('should test database connection successfully', async () => {
      const result = await database.testConnection();

      expect(result).toBe(true);
      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.ping).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should log successful connection test', async () => {
      await database.testConnection();

      expect(logger.info).toHaveBeenCalledWith('Database connection test successful');
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      mockPool.getConnection.mockRejectedValue(error);

      await expect(database.testConnection()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Database connection test failed',
        expect.objectContaining({ error: 'Connection failed' })
      );
    });

    it('should handle ping failure', async () => {
      const error = new Error('Ping failed');
      mockConnection.ping.mockRejectedValue(error);

      await expect(database.testConnection()).rejects.toThrow('Ping failed');
    });

    it('should release connection even on error', async () => {
      mockConnection.ping.mockRejectedValue(new Error('Ping failed'));

      try {
        await database.testConnection();
      } catch {
        // Expected to throw
      }

      // Connection should still be released
      expect(mockPool.getConnection).toHaveBeenCalled();
    });
  });

  describe('initializeSchema', () => {
    it('should initialize database schema', async () => {
      await database.initializeSchema();

      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should create users table', async () => {
      await database.initializeSchema();

      const query = mockConnection.query.mock.calls[0][0];
      expect(query).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(query).toContain('id INT AUTO_INCREMENT PRIMARY KEY');
      expect(query).toContain('name VARCHAR(255) NOT NULL');
      expect(query).toContain('email VARCHAR(255) NOT NULL UNIQUE');
    });

    it('should log schema initialization', async () => {
      await database.initializeSchema();

      expect(logger.info).toHaveBeenCalledWith('Initializing database schema');
      expect(logger.info).toHaveBeenCalledWith('Database schema initialized successfully');
    });

    it('should handle schema initialization failure', async () => {
      const error = new Error('Schema creation failed');
      mockConnection.query.mockRejectedValue(error);

      await expect(database.initializeSchema()).rejects.toThrow('Schema creation failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize database schema',
        expect.objectContaining({ error: 'Schema creation failed' })
      );
    });

    it('should release connection after schema initialization', async () => {
      await database.initializeSchema();

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should release connection even on error', async () => {
      mockConnection.query.mockRejectedValue(new Error('Query failed'));

      try {
        await database.initializeSchema();
      } catch {
        // Expected to throw
      }

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should create table with proper indexes', async () => {
      await database.initializeSchema();

      const query = mockConnection.query.mock.calls[0][0];
      expect(query).toContain('INDEX idx_email (email)');
      expect(query).toContain('INDEX idx_created_at (created_at)');
    });

    it('should use InnoDB engine', async () => {
      await database.initializeSchema();

      const query = mockConnection.query.mock.calls[0][0];
      expect(query).toContain('ENGINE=InnoDB');
    });

    it('should use UTF-8 charset', async () => {
      await database.initializeSchema();

      const query = mockConnection.query.mock.calls[0][0];
      expect(query).toContain('CHARSET=utf8mb4');
      expect(query).toContain('COLLATE=utf8mb4_unicode_ci');
    });
  });

  describe('closePool', () => {
    it('should close the connection pool', async () => {
      database.getPool(); // Create pool first
      await database.closePool();

      expect(mockPool.end).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Closing database connection pool');
    });

    it('should do nothing if pool is not initialized', async () => {
      // Don't create pool
      await database.closePool();

      expect(mockPool.end).not.toHaveBeenCalled();
    });

    it('should allow creating new pool after closing', async () => {
      database.getPool();
      await database.closePool();

      mysql.createPool.mockClear();
      database.getPool();

      expect(mysql.createPool).toHaveBeenCalled();
    });

    it('should handle pool close errors gracefully', async () => {
      database.getPool();
      mockPool.end.mockRejectedValue(new Error('Close failed'));

      await expect(database.closePool()).rejects.toThrow('Close failed');
    });
  });

  describe('Pool Event Handlers', () => {
    it('should log when new connection is established', () => {
      database.getPool();

      const connectionHandler = mockPool.on.mock.calls.find((call) => call[0] === 'connection')[1];

      connectionHandler(mockConnection);

      expect(logger.debug).toHaveBeenCalledWith(
        'New database connection established',
        expect.objectContaining({ threadId: 12345 })
      );
    });

    it('should log when connection is acquired', () => {
      database.getPool();

      const acquireHandler = mockPool.on.mock.calls.find((call) => call[0] === 'acquire')[1];

      acquireHandler(mockConnection);

      expect(logger.debug).toHaveBeenCalledWith(
        'Connection acquired from pool',
        expect.objectContaining({ threadId: 12345 })
      );
    });

    it('should log when connection is released', () => {
      database.getPool();

      const releaseHandler = mockPool.on.mock.calls.find((call) => call[0] === 'release')[1];

      releaseHandler(mockConnection);

      expect(logger.debug).toHaveBeenCalledWith(
        'Connection released back to pool',
        expect.objectContaining({ threadId: 12345 })
      );
    });
  });

  describe('Module Exports', () => {
    it('should export getPool function', () => {
      expect(typeof database.getPool).toBe('function');
    });

    it('should export testConnection function', () => {
      expect(typeof database.testConnection).toBe('function');
    });

    it('should export initializeSchema function', () => {
      expect(typeof database.initializeSchema).toBe('function');
    });

    it('should export closePool function', () => {
      expect(typeof database.closePool).toBe('function');
    });
  });
});
