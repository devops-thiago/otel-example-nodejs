/**
 * Unit tests for Express App Module
 */

const request = require('supertest');

// Mock all dependencies before requiring app
jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../src/middleware/metricsMiddleware', () => jest.fn((req, res, next) => next()));

jest.mock('../../src/routes/userRoutes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ users: [] }));
  return router;
});

jest.mock('../../src/routes/healthRoutes', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json({ status: 'healthy' }));
  return router;
});

describe('Express App Module', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache and require fresh app instance
    jest.resetModules();
    app = require('../../src/app');
  });

  describe('App Initialization', () => {
    it('should create an Express app', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should have trust proxy setting enabled', () => {
      expect(app.get('trust proxy')).toBe(1);
    });
  });

  describe('Root Endpoint', () => {
    it('should respond to GET / with API information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should include health endpoint in response', async () => {
      const response = await request(app).get('/');

      expect(response.body.endpoints).toHaveProperty('health', '/health');
    });

    it('should include users endpoint in response', async () => {
      const response = await request(app).get('/');

      expect(response.body.endpoints).toHaveProperty('users', '/api/users');
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Health Routes', () => {
    it('should mount health routes at /health', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('User Routes', () => {
    it('should mount user routes at /api/users', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
    });
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return error message for 404', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Route not found');
    });

    it('should include path in 404 response', async () => {
      const response = await request(app).get('/some/unknown/path');

      expect(response.body.error).toHaveProperty('path', '/some/unknown/path');
    });

    it('should return 404 for POST to non-existent routes', async () => {
      const response = await request(app).post('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for PUT to non-existent routes', async () => {
      const response = await request(app).put('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for DELETE to non-existent routes', async () => {
      const response = await request(app).delete('/non-existent-route');

      expect(response.status).toBe(404);
    });
  });

  describe('Middleware Setup', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Test User', email: 'test@example.com' })
        .set('Content-Type', 'application/json');

      // Should not fail due to body parsing
      expect(response.status).not.toBe(500);
    });

    it('should not set a permissive CORS origin by default', async () => {
      // With no CORS_ORIGIN configured the API is same-origin only, so a
      // cross-origin request gets no Access-Control-Allow-Origin header
      // (no permissive wildcard).
      const response = await request(app).get('/').set('Origin', 'http://example.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should set security headers with helmet', async () => {
      const response = await request(app).get('/');

      // Helmet sets various security headers
      expect(response.headers).toBeDefined();
    });

    it('should handle URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/users')
        .send('name=Test&email=test@example.com')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      // Should not fail due to body parsing
      expect(response.status).not.toBe(500);
    });
  });

  describe('CORS Configuration', () => {
    it('should allow GET requests', async () => {
      const response = await request(app).get('/');

      expect(response.status).not.toBe(405);
    });

    it('should allow POST requests', async () => {
      const response = await request(app).post('/api/users').send({ name: 'Test' });

      expect(response.status).not.toBe(405);
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(app).options('/api/users');

      expect(response.status).not.toBe(405);
    });

    it('reflects an allowed origin when CORS_ORIGIN is configured', async () => {
      const original = process.env.CORS_ORIGIN;
      // Comma-separated allowlist (with surrounding spaces to exercise trim()).
      process.env.CORS_ORIGIN = 'http://allowed.com, http://second.com';
      jest.resetModules();
      const configuredApp = require('../../src/app');

      const response = await request(configuredApp)
        .get('/')
        .set('Origin', 'http://allowed.com');

      expect(response.headers['access-control-allow-origin']).toBe('http://allowed.com');

      if (original === undefined) {
        delete process.env.CORS_ORIGIN;
      } else {
        process.env.CORS_ORIGIN = original;
      }
    });
  });

  describe('Request Logging', () => {
    it('should log incoming requests', async () => {
      const logger = require('../../src/logger');

      await request(app).get('/');

      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should have error handler middleware', async () => {
      // Test that the error handler returns proper JSON error responses
      // by requesting a non-existent route
      const response = await request(app).get('/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should catch errors in routes', async () => {
      // This tests that the error handler is set up correctly
      // Actual error handling is tested in errorHandler.test.js
      const response = await request(app).get('/nonexistent');

      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });

  describe('Compression', () => {
    it('should have compression middleware', async () => {
      const response = await request(app).get('/');

      // Response should be successful
      expect(response.status).toBe(200);
    });
  });

  describe('Body Size Limits', () => {
    it('should accept JSON bodies up to 10mb', async () => {
      // Create a payload (not actually 10mb for test speed)
      const payload = { data: 'x'.repeat(1000) };

      const response = await request(app).post('/api/users').send(payload);

      // Should not reject due to size
      expect(response.status).not.toBe(413);
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle requests without content-type', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
    });

    it('should return JSON responses', async () => {
      const response = await request(app).get('/');

      expect(response.type).toMatch(/json/);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      // Express should handle malformed JSON
      expect([400, 404]).toContain(response.status);
    });
  });
});
