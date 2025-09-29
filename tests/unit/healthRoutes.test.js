/**
 * Unit tests for Health Routes
 */

const request = require('supertest');
const express = require('express');

// Mock database module
jest.mock('../../src/database', () => ({
  testConnection: jest.fn(),
}));

jest.mock('../../src/config', () => ({
  otel: {
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    environment: 'test',
  },
}));

describe('Health Routes', () => {
  let app;
  let database;
  let healthRoutes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup app
    app = express();
    app.use(express.json());

    // Get mocked database
    database = require('../../src/database');
    database.testConnection.mockResolvedValue(true);

    // Load routes
    healthRoutes = require('../../src/routes/healthRoutes');
    app.use('/health', healthRoutes);
  });

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should return ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include service information', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('service', 'test-service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('environment', 'test');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when database is ready', async () => {
      database.testConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
    });

    it('should return ready status', async () => {
      database.testConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should include database check as ok', async () => {
      database.testConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.body.checks).toHaveProperty('database', 'ok');
    });

    it('should call testConnection', async () => {
      await request(app).get('/health/ready');

      expect(database.testConnection).toHaveBeenCalled();
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 503 when database is not ready', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
    });

    it('should return not_ready status on database failure', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/health/ready');

      expect(response.body).toHaveProperty('status', 'not_ready');
    });

    it('should include database check as failed', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/health/ready');

      expect(response.body.checks).toHaveProperty('database', 'failed');
    });

    it('should include error message on failure', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/health/ready');

      expect(response.body).toHaveProperty('error', 'Connection failed');
    });

    it('should return JSON content type on error', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app).get('/health/ready');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
    });

    it('should return alive status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.body).toHaveProperty('status', 'alive');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health/live');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/health/live');

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/health/live');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should not check database connection', async () => {
      await request(app).get('/health/live');

      expect(database.testConnection).not.toHaveBeenCalled();
    });
  });

  describe('Route Configuration', () => {
    it('should export an Express router', () => {
      expect(typeof healthRoutes).toBe('function');
      expect(healthRoutes.stack).toBeDefined();
    });

    it('should have three routes defined', () => {
      const routes = healthRoutes.stack.filter((layer) => layer.route);
      expect(routes.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database timeout', async () => {
      database.testConnection.mockRejectedValue(new Error('Timeout'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Timeout');
    });

    it('should handle database connection refused', async () => {
      database.testConnection.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Connection refused');
    });
  });
});
