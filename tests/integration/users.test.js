/**
 * Integration Tests for User API
 */

const request = require('supertest');
const app = require('../../src/app');
const { getPool, initializeSchema, closePool } = require('../../src/database');

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database schema
    await initializeSchema();
  });

  afterAll(async () => {
    // Clean up
    const pool = getPool();
    await pool.query('DELETE FROM users');
    await closePool();
  });

  beforeEach(async () => {
    // Clear users table before each test
    const pool = getPool();
    await pool.query('DELETE FROM users');
  });

  describe('GET /api/users', () => {
    it('should return empty array when no users exist', async () => {
      const response = await request(app).get('/api/users').expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return all users with pagination', async () => {
      // Create test users
      const pool = getPool();
      await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?), (?, ?, ?)', [
        'Alice',
        'alice@example.com',
        30,
        'Bob',
        'bob@example.com',
        25,
      ]);

      const response = await request(app).get('/api/users?limit=10&offset=0').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support pagination with limit and offset', async () => {
      // Create 5 test users
      const pool = getPool();
      for (let i = 1; i <= 5; i++) {
        await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
          `User${i}`,
          `user${i}@example.com`,
          20 + i,
        ]);
      }

      const response = await request(app).get('/api/users?limit=2&offset=2').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by ID', async () => {
      const pool = getPool();
      const [result] = await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Alice',
        'alice@example.com',
        30,
      ]);

      const response = await request(app).get(`/api/users/${result.insertId}`).expect(200);

      expect(response.body.data).toMatchObject({
        id: result.insertId,
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/99999').expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid ID', async () => {
      await request(app).get('/api/users/invalid').expect(400);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 28,
      };

      const response = await request(app).post('/api/users').send(userData).expect(201);

      expect(response.body.data).toMatchObject(userData);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/users').send({ name: 'Test' }).expect(400);

      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test',
          email: 'invalid-email',
          age: 25,
        })
        .expect(400);

      expect(response.body.error.details).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        name: 'Dave',
        email: 'dave@example.com',
        age: 32,
      };

      await request(app).post('/api/users').send(userData).expect(201);

      const response = await request(app).post('/api/users').send(userData).expect(409);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user', async () => {
      const pool = getPool();
      const [result] = await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Eve',
        'eve@example.com',
        27,
      ]);

      const updateData = {
        name: 'Eve Updated',
        age: 28,
      };

      const response = await request(app)
        .put(`/api/users/${result.insertId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe('Eve Updated');
      expect(response.body.data.age).toBe(28);
      expect(response.body.data.email).toBe('eve@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/99999')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for empty update', async () => {
      const pool = getPool();
      const [result] = await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Frank',
        'frank@example.com',
        35,
      ]);

      await request(app).put(`/api/users/${result.insertId}`).send({}).expect(400);
    });

    it('should return 409 for duplicate email on update', async () => {
      const pool = getPool();
      await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?), (?, ?, ?)', [
        'User1',
        'user1@example.com',
        25,
        'User2',
        'user2@example.com',
        30,
      ]);

      const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [
        'user1@example.com',
      ]);
      const userId = rows[0].id;

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send({ email: 'user2@example.com' })
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      const pool = getPool();
      const [result] = await pool.query('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        'Grace',
        'grace@example.com',
        29,
      ]);

      await request(app).delete(`/api/users/${result.insertId}`).expect(204);

      // Verify user is deleted
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      expect(rows).toHaveLength(0);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).delete('/api/users/99999').expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });
});
