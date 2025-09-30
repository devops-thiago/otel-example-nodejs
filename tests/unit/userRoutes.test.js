/**
 * Unit tests for User Routes
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies BEFORE requiring anything else
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/database', () => ({
  getPool: jest.fn(),
  testConnection: jest.fn(),
  initializeSchema: jest.fn(),
  closePool: jest.fn(),
}));

jest.mock('../../src/metrics', () => ({
  recordDbQuery: jest.fn(),
  trackActiveDbConnections: jest.fn(),
  recordHttpRequest: jest.fn(),
  trackActiveHttpRequests: jest.fn(),
  meter: {},
}));

jest.mock('../../src/repositories/userRepository');

const userRepository = require('../../src/repositories/userRepository');
const { errorHandler } = require('../../src/middleware/errorHandler');

describe('User Routes', () => {
  let app;
  let userRoutes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup app
    app = express();
    app.use(express.json());

    // Load routes
    userRoutes = require('../../src/routes/userRoutes');
    app.use('/api/users', userRoutes);

    // Add error handler
    app.use(errorHandler);
  });

  describe('GET /api/users', () => {
    it('should return all users with pagination', async () => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Doe', email: 'jane@example.com', age: 25 },
      ];

      userRepository.findAll.mockResolvedValue(mockUsers);
      userRepository.count.mockResolvedValue(2);

      const response = await request(app).get('/api/users?limit=10&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 2,
      });
      expect(userRepository.findAll).toHaveBeenCalledWith(10, 0);
      expect(userRepository.count).toHaveBeenCalled();
    });

    it('should use default pagination values', async () => {
      userRepository.findAll.mockResolvedValue([]);
      userRepository.count.mockResolvedValue(0);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(userRepository.findAll).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      userRepository.findAll.mockRejectedValue(new Error('Database error'));
      userRepository.count.mockResolvedValue(0);

      const response = await request(app).get('/api/users?limit=10&offset=0');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app).get('/api/users?limit=invalid&offset=0');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      userRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const response = await request(app).get('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('not found');
    });

    it('should validate id parameter', async () => {
      const response = await request(app).get('/api/users/invalid');

      expect(response.status).toBe(400);
    });

    it('should handle repository errors', async () => {
      userRepository.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = { name: 'John Doe', email: 'john@example.com', age: 30 };
      const createdUser = { id: 1, ...newUser };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(createdUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(newUser.email);
      expect(userRepository.create).toHaveBeenCalledWith(newUser);
    });

    it('should return 409 when email already exists', async () => {
      const newUser = { name: 'John Doe', email: 'john@example.com', age: 30 };
      const existingUser = { id: 1, ...newUser };

      userRepository.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('already exists');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await request(app).post('/api/users').send({});

      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const response = await request(app).post('/api/users').send({
        name: 'John Doe',
        email: 'invalid-email',
        age: 30,
      });

      expect(response.status).toBe(400);
    });

    it('should validate age is a number', async () => {
      const response = await request(app).post('/api/users').send({
        name: 'John Doe',
        email: 'john@example.com',
        age: 'thirty',
      });

      expect(response.status).toBe(400);
    });

    it('should handle repository errors', async () => {
      const newUser = { name: 'John Doe', email: 'john@example.com', age: 30 };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/api/users').send(newUser);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      const updateData = { name: 'John Updated', age: 31 };
      const updatedUser = { id: 1, name: 'John Updated', email: 'john@example.com', age: 31 };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const response = await request(app).put('/api/users/1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(updatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith(1);
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        name: 'John Updated',
        email: 'john@example.com',
        age: 31,
      });
    });

    it('should return 404 when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const response = await request(app).put('/api/users/999').send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('not found');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should update email if provided', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      const updateData = { email: 'newemail@example.com' };
      const updatedUser = { id: 1, name: 'John Doe', email: 'newemail@example.com', age: 30 };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.update.mockResolvedValue(updatedUser);

      const response = await request(app).put('/api/users/1').send(updateData);

      expect(response.status).toBe(200);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('newemail@example.com');
    });

    it('should return 409 when new email already exists', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      const otherUser = { id: 2, name: 'Jane Doe', email: 'jane@example.com', age: 25 };
      const updateData = { email: 'jane@example.com' };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.findByEmail.mockResolvedValue(otherUser);

      const response = await request(app).put('/api/users/1').send(updateData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('already exists');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should not check email if not being changed', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      const updateData = { name: 'John Updated' };
      const updatedUser = { id: 1, name: 'John Updated', email: 'john@example.com', age: 30 };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const response = await request(app).put('/api/users/1').send(updateData);

      expect(response.status).toBe(200);
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should allow same email for same user', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };
      const updateData = { email: 'john@example.com', name: 'John Updated' };
      const updatedUser = { id: 1, name: 'John Updated', email: 'john@example.com', age: 30 };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.update.mockResolvedValue(updatedUser);

      const response = await request(app).put('/api/users/1').send(updateData);

      expect(response.status).toBe(200);
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should validate id parameter', async () => {
      const response = await request(app).put('/api/users/invalid').send({ name: 'Updated' });

      expect(response.status).toBe(400);
    });

    it('should validate update data', async () => {
      const response = await request(app).put('/api/users/1').send({ age: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should handle repository errors', async () => {
      const existingUser = { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 };

      userRepository.findById.mockResolvedValue(existingUser);
      userRepository.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/api/users/1').send({ name: 'Updated' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      userRepository.delete.mockResolvedValue(true);

      const response = await request(app).delete('/api/users/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should return 404 when user not found', async () => {
      userRepository.delete.mockResolvedValue(false);

      const response = await request(app).delete('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('not found');
    });

    it('should validate id parameter', async () => {
      const response = await request(app).delete('/api/users/invalid');

      expect(response.status).toBe(400);
    });

    it('should handle repository errors', async () => {
      userRepository.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/users/1');

      expect(response.status).toBe(500);
    });
  });

  describe('Route Configuration', () => {
    it('should export an Express router', () => {
      expect(typeof userRoutes).toBe('function');
      expect(userRoutes.stack).toBeDefined();
    });

    it('should have five routes defined', () => {
      const routes = userRoutes.stack.filter((layer) => layer.route);
      expect(routes.length).toBe(5);
    });

    it('should have GET /api/users route', () => {
      const route = userRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      expect(route).toBeDefined();
    });

    it('should have GET /api/users/:id route', () => {
      const route = userRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );
      expect(route).toBeDefined();
    });

    it('should have POST /api/users route', () => {
      const route = userRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
      );
      expect(route).toBeDefined();
    });

    it('should have PUT /api/users/:id route', () => {
      const route = userRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/:id' && layer.route.methods.put
      );
      expect(route).toBeDefined();
    });

    it('should have DELETE /api/users/:id route', () => {
      const route = userRoutes.stack.find(
        (layer) => layer.route && layer.route.path === '/:id' && layer.route.methods.delete
      );
      expect(route).toBeDefined();
    });
  });
});