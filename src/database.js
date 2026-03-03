/**
 * Database Connection Module
 * Manages MySQL connection pool with OpenTelemetry instrumentation
 */

const mysql = require('mysql2/promise');
const config = require('./config');
const logger = require('./logger');

// Create connection pool
let pool = null;

const createPool = () => {
  if (pool) {
    return pool;
  }

  logger.info('Creating database connection pool', {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
  });

  pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    connectionLimit: config.database.connectionLimit,
    waitForConnections: config.database.waitForConnections,
    queueLimit: config.database.queueLimit,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  // Handle pool errors
  pool.on('connection', (connection) => {
    logger.debug('New database connection established', { threadId: connection.threadId });
  });

  pool.on('acquire', (connection) => {
    logger.debug('Connection acquired from pool', { threadId: connection.threadId });
  });

  pool.on('release', (connection) => {
    logger.debug('Connection released back to pool', { threadId: connection.threadId });
  });

  return pool;
};

/**
 * Get database connection pool
 * @returns {mysql.Pool} MySQL connection pool
 */
const getPool = () => {
  if (!pool) {
    return createPool();
  }
  return pool;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    throw error;
  }
};

/**
 * Initialize database schema
 * @returns {Promise<void>}
 */
const initializeSchema = async () => {
  const connection = await getPool().getConnection();

  try {
    logger.info('Initializing database schema');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        bio TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', { error: error.message });
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
const closePool = async () => {
  if (pool) {
    logger.info('Closing database connection pool');
    await pool.end();
    pool = null;
  }
};

module.exports = {
  getPool,
  testConnection,
  initializeSchema,
  closePool,
};
