/**
 * Unit tests for Metrics Middleware
 */

const metricsMiddleware = require('../../src/middleware/metricsMiddleware');

// Mock dependencies
jest.mock('../../src/metrics', () => ({
  recordHttpRequest: jest.fn(),
  trackActiveHttpRequests: jest.fn(),
}));

jest.mock('../../src/logger', () => ({
  info: jest.fn(),
}));

describe('Metrics Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let metrics;
  let logger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      method: 'GET',
      path: '/api/users',
      route: {
        path: '/api/users',
      },
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent/1.0';
        return null;
      }),
      ip: '127.0.0.1',
    };

    // Setup mock response with event emitter
    mockRes = {
      on: jest.fn(),
      statusCode: 200,
    };

    // Setup mock next
    mockNext = jest.fn();

    // Get mocked modules
    metrics = require('../../src/metrics');
    logger = require('../../src/logger');
  });

  describe('Request Tracking', () => {
    it('should track active requests when middleware is called', () => {
      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'GET', '/api/users');
    });

    it('should call next middleware', () => {
      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should register finish event handler', () => {
      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('Response Completion', () => {
    it('should record metrics on response finish', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);

      // Simulate response finish
      finishHandler();

      expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
        expect.any(Number),
        'GET',
        '/api/users',
        200
      );
    });

    it('should decrement active requests on finish', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      const calls = metrics.trackActiveHttpRequests.mock.calls;
      expect(calls[0]).toEqual([1, 'GET', '/api/users']); // Increment
      expect(calls[1]).toEqual([-1, 'GET', '/api/users']); // Decrement
    });

    it('should log request completion', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP request completed',
        expect.objectContaining({
          method: 'GET',
          route: '/api/users',
          statusCode: 200,
          duration: expect.any(Number),
        })
      );
    });

    it('should include user agent in log', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP request completed',
        expect.objectContaining({
          userAgent: 'test-agent/1.0',
        })
      );
    });

    it('should include IP address in log', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP request completed',
        expect.objectContaining({
          ip: '127.0.0.1',
        })
      );
    });

    it('should calculate duration correctly', (done) => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);

      // Wait a bit to ensure duration > 0
      setTimeout(() => {
        finishHandler();

        const duration = metrics.recordHttpRequest.mock.calls[0][0];
        expect(duration).toBeGreaterThan(0);
        done();
      }, 10);
    });
  });

  describe('Different HTTP Methods', () => {
    it('should handle POST requests', () => {
      mockReq.method = 'POST';
      mockReq.route.path = '/api/users';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'POST', '/api/users');
    });

    it('should handle PUT requests', () => {
      mockReq.method = 'PUT';
      mockReq.route.path = '/api/users/1';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'PUT', '/api/users/1');
    });

    it('should handle DELETE requests', () => {
      mockReq.method = 'DELETE';
      mockReq.route.path = '/api/users/1';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'DELETE', '/api/users/1');
    });
  });

  describe('Different Status Codes', () => {
    it('should record 404 status', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });
      mockRes.statusCode = 404;

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
        expect.any(Number),
        'GET',
        '/api/users',
        404
      );
    });

    it('should record 500 status', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });
      mockRes.statusCode = 500;

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
        expect.any(Number),
        'GET',
        '/api/users',
        500
      );
    });

    it('should record 201 status', () => {
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });
      mockRes.statusCode = 201;

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
        expect.any(Number),
        'GET',
        '/api/users',
        201
      );
    });
  });

  describe('Route Path Handling', () => {
    it('should use route.path when available', () => {
      mockReq.route = { path: '/api/users/:id' };
      mockReq.path = '/api/users/123';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'GET', '/api/users/:id');
    });

    it('should use path when route.path is not available', () => {
      mockReq.route = null;
      mockReq.path = '/api/unknown';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'GET', '/api/unknown');
    });

    it('should use unknown when neither route nor path is available', () => {
      mockReq.route = null;
      mockReq.path = null;

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'GET', 'unknown');
    });

    it('should handle empty route object', () => {
      mockReq.route = {};
      mockReq.path = '/api/test';

      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledWith(1, 'GET', '/api/test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user-agent header', () => {
      mockReq.get.mockReturnValue(null);
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP request completed',
        expect.objectContaining({
          userAgent: null,
        })
      );
    });

    it('should handle missing IP address', () => {
      mockReq.ip = undefined;
      let finishHandler;
      mockRes.on.mockImplementation((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      metricsMiddleware(mockReq, mockRes, mockNext);
      finishHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'HTTP request completed',
        expect.objectContaining({
          ip: undefined,
        })
      );
    });

    it('should handle rapid sequential requests', () => {
      metricsMiddleware(mockReq, mockRes, mockNext);
      metricsMiddleware(mockReq, mockRes, mockNext);
      metricsMiddleware(mockReq, mockRes, mockNext);

      expect(metrics.trackActiveHttpRequests).toHaveBeenCalledTimes(3);
      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });
});
