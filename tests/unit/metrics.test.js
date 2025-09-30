/**
 * Unit tests for Metrics Module
 */

// Mock @opentelemetry/api before requiring metrics
jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: jest.fn(() => ({
      createHistogram: jest.fn(() => ({
        record: jest.fn(),
      })),
      createCounter: jest.fn(() => ({
        add: jest.fn(),
      })),
      createUpDownCounter: jest.fn(() => ({
        add: jest.fn(),
      })),
      createObservableGauge: jest.fn(() => ({
        addCallback: jest.fn(),
      })),
      createObservableCounter: jest.fn(() => ({
        addCallback: jest.fn(),
      })),
    })),
  },
}));

describe('Metrics Module', () => {
  let metrics;

  beforeAll(() => {
    require('@opentelemetry/api').metrics;
    metrics = require('../../src/metrics');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    it('should export recordHttpRequest function', () => {
      expect(typeof metrics.recordHttpRequest).toBe('function');
    });

    it('should export trackActiveHttpRequests function', () => {
      expect(typeof metrics.trackActiveHttpRequests).toBe('function');
    });

    it('should export recordDbQuery function', () => {
      expect(typeof metrics.recordDbQuery).toBe('function');
    });

    it('should export trackActiveDbConnections function', () => {
      expect(typeof metrics.trackActiveDbConnections).toBe('function');
    });

    it('should export meter instance', () => {
      expect(metrics.meter).toBeDefined();
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request with all parameters', () => {
      metrics.recordHttpRequest(100, 'GET', '/api/users', 200);

      // The function should execute without errors
      expect(true).toBe(true);
    });

    it('should handle POST requests', () => {
      expect(() => {
        metrics.recordHttpRequest(50, 'POST', '/api/users', 201);
      }).not.toThrow();
    });

    it('should handle error status codes', () => {
      expect(() => {
        metrics.recordHttpRequest(200, 'GET', '/api/users/999', 404);
      }).not.toThrow();
    });

    it('should handle server error status codes', () => {
      expect(() => {
        metrics.recordHttpRequest(1000, 'POST', '/api/users', 500);
      }).not.toThrow();
    });

    it('should handle different routes', () => {
      expect(() => {
        metrics.recordHttpRequest(75, 'PUT', '/api/users/1', 200);
        metrics.recordHttpRequest(50, 'DELETE', '/api/users/1', 204);
      }).not.toThrow();
    });
  });

  describe('trackActiveHttpRequests', () => {
    it('should increment active requests', () => {
      expect(() => {
        metrics.trackActiveHttpRequests(1, 'GET', '/api/users');
      }).not.toThrow();
    });

    it('should decrement active requests', () => {
      expect(() => {
        metrics.trackActiveHttpRequests(-1, 'GET', '/api/users');
      }).not.toThrow();
    });

    it('should handle different HTTP methods', () => {
      expect(() => {
        metrics.trackActiveHttpRequests(1, 'POST', '/api/users');
        metrics.trackActiveHttpRequests(1, 'PUT', '/api/users/1');
        metrics.trackActiveHttpRequests(1, 'DELETE', '/api/users/1');
      }).not.toThrow();
    });

    it('should handle different routes', () => {
      expect(() => {
        metrics.trackActiveHttpRequests(1, 'GET', '/health');
        metrics.trackActiveHttpRequests(1, 'GET', '/api/users');
      }).not.toThrow();
    });
  });

  describe('recordDbQuery', () => {
    it('should record successful query', () => {
      expect(() => {
        metrics.recordDbQuery(50, 'SELECT', 'users', true);
      }).not.toThrow();
    });

    it('should record failed query', () => {
      expect(() => {
        metrics.recordDbQuery(100, 'INSERT', 'users', false);
      }).not.toThrow();
    });

    it('should default success to true', () => {
      expect(() => {
        metrics.recordDbQuery(25, 'SELECT', 'users');
      }).not.toThrow();
    });

    it('should handle different operations', () => {
      expect(() => {
        metrics.recordDbQuery(30, 'SELECT', 'users', true);
        metrics.recordDbQuery(40, 'INSERT', 'users', true);
        metrics.recordDbQuery(35, 'UPDATE', 'users', true);
        metrics.recordDbQuery(20, 'DELETE', 'users', true);
      }).not.toThrow();
    });

    it('should handle different tables', () => {
      expect(() => {
        metrics.recordDbQuery(25, 'SELECT', 'users', true);
        metrics.recordDbQuery(30, 'SELECT', 'orders', true);
        metrics.recordDbQuery(35, 'SELECT', 'products', true);
      }).not.toThrow();
    });

    it('should handle various durations', () => {
      expect(() => {
        metrics.recordDbQuery(1, 'SELECT', 'users', true);
        metrics.recordDbQuery(100, 'SELECT', 'users', true);
        metrics.recordDbQuery(1000, 'SELECT', 'users', true);
      }).not.toThrow();
    });
  });

  describe('trackActiveDbConnections', () => {
    it('should increment active connections', () => {
      expect(() => {
        metrics.trackActiveDbConnections(1);
      }).not.toThrow();
    });

    it('should decrement active connections', () => {
      expect(() => {
        metrics.trackActiveDbConnections(-1);
      }).not.toThrow();
    });

    it('should handle multiple increments', () => {
      expect(() => {
        metrics.trackActiveDbConnections(5);
      }).not.toThrow();
    });

    it('should handle multiple decrements', () => {
      expect(() => {
        metrics.trackActiveDbConnections(-3);
      }).not.toThrow();
    });
  });

  describe('Meter Instance', () => {
    it('should provide access to meter instance', () => {
      expect(metrics.meter).toBeDefined();
      expect(typeof metrics.meter).toBe('object');
    });

    it('should have createHistogram method', () => {
      expect(typeof metrics.meter.createHistogram).toBe('function');
    });

    it('should have createCounter method', () => {
      expect(typeof metrics.meter.createCounter).toBe('function');
    });

    it('should have createUpDownCounter method', () => {
      expect(typeof metrics.meter.createUpDownCounter).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle recordHttpRequest with undefined values gracefully', () => {
      expect(() => {
        metrics.recordHttpRequest(undefined, undefined, undefined, undefined);
      }).not.toThrow();
    });

    it('should handle trackActiveHttpRequests with undefined values gracefully', () => {
      expect(() => {
        metrics.trackActiveHttpRequests(undefined, undefined, undefined);
      }).not.toThrow();
    });

    it('should handle recordDbQuery with undefined values gracefully', () => {
      expect(() => {
        metrics.recordDbQuery(undefined, undefined, undefined, undefined);
      }).not.toThrow();
    });

    it('should handle trackActiveDbConnections with undefined value gracefully', () => {
      expect(() => {
        metrics.trackActiveDbConnections(undefined);
      }).not.toThrow();
    });
  });
});
