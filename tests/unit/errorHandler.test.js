/**
 * Unit tests for Error Handler Middleware
 */

const { ApiError, errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');

// Mock dependencies
jest.mock('../../src/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: jest.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let logger;
  let trace;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      method: 'GET',
      path: '/api/test',
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return null;
      }),
      ip: '127.0.0.1',
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next
    mockNext = jest.fn();

    // Get mocked modules
    logger = require('../../src/logger');
    trace = require('@opentelemetry/api').trace;
  });

  describe('ApiError Class', () => {
    it('should create an ApiError with default values', () => {
      const error = new ApiError(404, 'Not found');

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create an ApiError with custom operational flag', () => {
      const error = new ApiError(500, 'Internal error', false);

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal error');
      expect(error.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(400, 'Bad request');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Bad request');
    });

    it('should be an instance of Error', () => {
      const error = new ApiError(403, 'Forbidden');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });
  });

  describe('errorHandler Middleware', () => {
    it('should handle error with default status code', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle ApiError with custom status code', () => {
      const error = new ApiError(404, 'Resource not found');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Resource not found',
          statusCode: 404,
        }),
      });
    });

    it('should log error with details', () => {
      const error = new ApiError(400, 'Bad request');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: 'Bad request',
          statusCode: 400,
          method: 'GET',
          path: '/api/test',
        })
      );
    });

    it('should include traceId when span is available', () => {
      const mockSpan = {
        spanContext: () => ({ traceId: 'test-trace-id-123' }),
        recordException: jest.fn(),
        setStatus: jest.fn(),
      };
      trace.getActiveSpan.mockReturnValue(mockSpan);

      const error = new ApiError(500, 'Server error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          traceId: 'test-trace-id-123',
        }),
      });
    });

    it('should record exception in span when available', () => {
      const mockSpan = {
        spanContext: () => ({ traceId: 'trace-123' }),
        recordException: jest.fn(),
        setStatus: jest.fn(),
      };
      trace.getActiveSpan.mockReturnValue(mockSpan);

      const error = new ApiError(500, 'Server error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'Server error',
      });
    });

    it('should handle error when no span is available', () => {
      trace.getActiveSpan.mockReturnValue(null);

      const error = new ApiError(400, 'Bad request');

      expect(() => {
        errorHandler(error, mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Bad request',
          traceId: undefined,
        }),
      });
    });

    it('should include stack trace in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n  at test.js:1:1';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          stack: error.stack,
        }),
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Prod error');

      errorHandler(error, mockReq, mockRes, mockNext);

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should use default message for errors without message', () => {
      const error = new Error();
      error.message = '';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Internal Server Error',
        }),
      });
    });
  });

  describe('notFoundHandler Middleware', () => {
    it('should return 404 status', () => {
      notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return not found error message', () => {
      notFoundHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Route not found',
          statusCode: 404,
          path: '/api/test',
        },
      });
    });

    it('should log warning with request details', () => {
      notFoundHandler(mockReq, mockRes);

      expect(logger.warn).toHaveBeenCalledWith('Route not found', {
        method: 'GET',
        path: '/api/test',
      });
    });

    it('should handle different HTTP methods', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/users';

      notFoundHandler(mockReq, mockRes);

      expect(logger.warn).toHaveBeenCalledWith('Route not found', {
        method: 'POST',
        path: '/api/users',
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          path: '/api/users',
        }),
      });
    });

    it('should include path in response', () => {
      mockReq.path = '/unknown/route';

      notFoundHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          path: '/unknown/route',
        }),
      });
    });
  });

  describe('Error Handler Edge Cases', () => {
    it('should handle error with no statusCode property', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle error with invalid statusCode', () => {
      const error = new Error('Invalid error');
      error.statusCode = 'invalid';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith('invalid');
    });

    it('should log stack trace', () => {
      const error = new Error('Error with stack');
      error.stack = 'Error: Error with stack\n  at test.js:10:5';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          stack: error.stack,
        })
      );
    });
  });
});
