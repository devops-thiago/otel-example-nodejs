/**
 * User Repository
 * Handles all database operations for users with OpenTelemetry instrumentation
 */

const { getPool } = require('../database');
const { recordDbQuery } = require('../metrics');
const logger = require('../logger');
const { trace } = require('@opentelemetry/api');

class UserRepository {
  /**
   * Get all users with pagination
   * @param {number} limit - Maximum number of users to return
   * @param {number} offset - Number of users to skip
   * @returns {Promise<Array>} List of users
   */
  async findAll(limit = 100, offset = 0) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'SELECT');
      span?.setAttribute('db.table', 'users');

      const [rows] = await getPool().query(
        'SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', true);

      logger.debug('Users retrieved', { count: rows.length, limit, offset });
      return rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', false);

      logger.error('Failed to retrieve users', { error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'SELECT');
      span?.setAttribute('db.table', 'users');
      span?.setAttribute('user.id', id);

      const [rows] = await getPool().query(
        'SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', true);

      return rows[0] || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', false);

      logger.error('Failed to retrieve user', { id, error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'SELECT');
      span?.setAttribute('db.table', 'users');

      const [rows] = await getPool().query(
        'SELECT id, name, email, age, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', true);

      return rows[0] || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', false);

      logger.error('Failed to retrieve user by email', { email, error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'INSERT');
      span?.setAttribute('db.table', 'users');

      const { name, email, age } = userData;
      const [result] = await getPool().query(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        [name, email, age]
      );

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'INSERT', 'users', true);

      const createdUser = await this.findById(result.insertId);
      logger.info('User created', { id: result.insertId, email });

      return createdUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'INSERT', 'users', false);

      logger.error('Failed to create user', { userData, error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object|null>} Updated user or null
   */
  async update(id, userData) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'UPDATE');
      span?.setAttribute('db.table', 'users');
      span?.setAttribute('user.id', id);

      const { name, email, age } = userData;
      const [result] = await getPool().query(
        'UPDATE users SET name = ?, email = ?, age = ? WHERE id = ?',
        [name, email, age, id]
      );

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'UPDATE', 'users', true);

      if (result.affectedRows === 0) {
        return null;
      }

      const updatedUser = await this.findById(id);
      logger.info('User updated', { id, email });

      return updatedUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'UPDATE', 'users', false);

      logger.error('Failed to update user', { id, userData, error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  async delete(id) {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'DELETE');
      span?.setAttribute('db.table', 'users');
      span?.setAttribute('user.id', id);

      const [result] = await getPool().query('DELETE FROM users WHERE id = ?', [id]);

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'DELETE', 'users', true);

      if (result.affectedRows === 0) {
        return false;
      }

      logger.info('User deleted', { id });
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'DELETE', 'users', false);

      logger.error('Failed to delete user', { id, error: error.message });
      span?.recordException(error);
      throw error;
    }
  }

  /**
   * Get total count of users
   * @returns {Promise<number>} Total count
   */
  async count() {
    const startTime = Date.now();
    const span = trace.getActiveSpan();

    try {
      span?.setAttribute('db.operation', 'SELECT');
      span?.setAttribute('db.table', 'users');

      const [rows] = await getPool().query('SELECT COUNT(*) as count FROM users');

      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', true);

      return rows[0].count;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDbQuery(duration, 'SELECT', 'users', false);

      logger.error('Failed to count users', { error: error.message });
      span?.recordException(error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
