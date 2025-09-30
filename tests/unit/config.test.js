/**
 * Unit tests for Configuration Module
 */

describe('Configuration Module', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear module cache to reload config with new env vars
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    it('should load default server configuration', () => {
      const config = require('../../src/config');
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.server.port).toBe(8080);
    });

    it('should load default database configuration', () => {
      const config = require('../../src/config');
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(3306);
      expect(config.database.user).toBe('appuser');
      expect(config.database.password).toBe('apppassword');
      expect(config.database.database).toBe('otel_example');
      expect(config.database.connectionLimit).toBe(10);
      expect(config.database.waitForConnections).toBe(true);
      expect(config.database.queueLimit).toBe(0);
    });

    it('should load default app configuration', () => {
      const config = require('../../src/config');
      expect(config.app.env).toBe('test'); // Jest sets NODE_ENV=test
      expect(config.app.logLevel).toBe('info');
    });

    it('should load default otel configuration', () => {
      const config = require('../../src/config');
      expect(config.otel.serviceName).toBe('otel-example-nodejs-api');
      expect(config.otel.serviceVersion).toBe('1.0.0');
      expect(config.otel.environment).toBe('test'); // NODE_ENV=test
      expect(config.otel.endpoint).toBe('localhost:4320');
      expect(config.otel.enableTracing).toBe(true);
      expect(config.otel.enableMetrics).toBe(true);
      expect(config.otel.enableLogging).toBe(true);
    });
  });

  describe('Environment Variable Override', () => {
    it('should override server configuration from env vars', () => {
      process.env.SERVER_HOST = '127.0.0.1';
      process.env.SERVER_PORT = '3000';
      const config = require('../../src/config');
      expect(config.server.host).toBe('127.0.0.1');
      expect(config.server.port).toBe(3000);
    });

    it('should override database configuration from env vars', () => {
      process.env.DB_HOST = 'mysql-server';
      process.env.DB_PORT = '3307';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';
      process.env.DB_NAME = 'testdb';
      process.env.DB_CONNECTION_LIMIT = '20';

      const config = require('../../src/config');
      expect(config.database.host).toBe('mysql-server');
      expect(config.database.port).toBe(3307);
      expect(config.database.user).toBe('testuser');
      expect(config.database.password).toBe('testpass');
      expect(config.database.database).toBe('testdb');
      expect(config.database.connectionLimit).toBe(20);
    });

    it('should override app configuration from env vars', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';
      const config = require('../../src/config');
      expect(config.app.env).toBe('production');
      expect(config.app.logLevel).toBe('warn');
    });

    it('should override otel configuration from env vars', () => {
      process.env.OTEL_SERVICE_NAME = 'custom-service';
      process.env.OTEL_SERVICE_VERSION = '2.0.0';
      process.env.OTEL_ENVIRONMENT = 'staging';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'collector:4317';

      const config = require('../../src/config');
      expect(config.otel.serviceName).toBe('custom-service');
      expect(config.otel.serviceVersion).toBe('2.0.0');
      expect(config.otel.environment).toBe('staging');
      expect(config.otel.endpoint).toBe('collector:4317');
    });

    it('should handle otel boolean flags correctly', () => {
      process.env.OTEL_ENABLE_TRACING = 'false';
      process.env.OTEL_ENABLE_METRICS = 'false';
      process.env.OTEL_ENABLE_LOGGING = 'false';

      const config = require('../../src/config');
      expect(config.otel.enableTracing).toBe(false);
      expect(config.otel.enableMetrics).toBe(false);
      expect(config.otel.enableLogging).toBe(false);
    });

    it('should treat any non-false value as true for otel flags', () => {
      process.env.OTEL_ENABLE_TRACING = 'true';
      process.env.OTEL_ENABLE_METRICS = '1';
      process.env.OTEL_ENABLE_LOGGING = 'yes';

      const config = require('../../src/config');
      expect(config.otel.enableTracing).toBe(true);
      expect(config.otel.enableMetrics).toBe(true);
      expect(config.otel.enableLogging).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should pass validation with all required fields', () => {
      expect(() => require('../../src/config')).not.toThrow();
    });

    it('should have required configuration fields', () => {
      const config = require('../../src/config');
      expect(config.server.port).toBeTruthy();
      expect(config.database.host).toBeTruthy();
      expect(config.database.database).toBeTruthy();
    });
  });

  describe('Type Conversions', () => {
    it('should parse port numbers as integers', () => {
      process.env.SERVER_PORT = '9000';
      process.env.DB_PORT = '5432';
      const config = require('../../src/config');
      expect(typeof config.server.port).toBe('number');
      expect(config.server.port).toBe(9000);
      expect(typeof config.database.port).toBe('number');
      expect(config.database.port).toBe(5432);
    });

    it('should parse connection limit as integer', () => {
      process.env.DB_CONNECTION_LIMIT = '50';
      const config = require('../../src/config');
      expect(typeof config.database.connectionLimit).toBe('number');
      expect(config.database.connectionLimit).toBe(50);
    });

    it('should parse integer from string port', () => {
      process.env.SERVER_PORT = '5000';
      const config = require('../../src/config');
      expect(config.server.port).toBe(5000);
      expect(typeof config.server.port).toBe('number');
    });

    it('should handle zero as valid port', () => {
      process.env.DB_PORT = '0';
      const config = require('../../src/config');
      expect(config.database.port).toBe(0);
    });

    it('should use NODE_ENV for otel environment when OTEL_ENVIRONMENT not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.OTEL_ENVIRONMENT;
      const config = require('../../src/config');
      expect(config.otel.environment).toBe('production');
    });
  });
});
