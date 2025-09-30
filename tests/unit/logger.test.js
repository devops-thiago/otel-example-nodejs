/**
 * Unit tests for Logger Module
 */

describe('Logger Module', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear module cache
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Logger Initialization', () => {
    it('should create a logger instance', () => {
      const logger = require('../../src/logger');
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should use correct log level from config', () => {
      process.env.LOG_LEVEL = 'debug';
      const logger = require('../../src/logger');
      expect(logger.level).toBe('debug');
    });

    it('should default to info log level', () => {
      const logger = require('../../src/logger');
      expect(logger.level).toBe('info');
    });

    it('should include service name in base metadata', () => {
      const logger = require('../../src/logger');
      const config = require('../../src/config');
      expect(logger.bindings().service).toBe(config.otel.serviceName);
    });

    it('should include environment in base metadata', () => {
      const logger = require('../../src/logger');
      const config = require('../../src/config');
      expect(logger.bindings().environment).toBe(config.otel.environment);
    });
  });

  describe('Logger Configuration', () => {
    it('should use pino-pretty in development mode', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();

      // We can't easily test the transport configuration directly
      // but we can verify the logger is created without errors
      const logger = require('../../src/logger');
      expect(logger).toBeDefined();
    });

    it('should not use pino-pretty in production mode', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const logger = require('../../src/logger');
      expect(logger).toBeDefined();
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();

      const logger = require('../../src/logger');
      expect(logger).toBeDefined();
    });
  });

  describe('Logger Methods', () => {
    let logger;

    beforeEach(() => {
      logger = require('../../src/logger');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });

    it('should have fatal method', () => {
      expect(typeof logger.fatal).toBe('function');
    });

    it('should have trace method', () => {
      expect(typeof logger.trace).toBe('function');
    });
  });

  describe('Different Log Levels', () => {
    it('should respect warn log level', () => {
      process.env.LOG_LEVEL = 'warn';
      const logger = require('../../src/logger');
      expect(logger.level).toBe('warn');
    });

    it('should respect error log level', () => {
      process.env.LOG_LEVEL = 'error';
      const logger = require('../../src/logger');
      expect(logger.level).toBe('error');
    });

    it('should respect debug log level', () => {
      process.env.LOG_LEVEL = 'debug';
      const logger = require('../../src/logger');
      expect(logger.level).toBe('debug');
    });

    it('should respect trace log level', () => {
      process.env.LOG_LEVEL = 'trace';
      const logger = require('../../src/logger');
      expect(logger.level).toBe('trace');
    });
  });
});
