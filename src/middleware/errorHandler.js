/**
 * Error Handling Middleware
 * Catches and formats errors with proper logging
 */

const logger = require('../logger');
const { trace } = require('@opentelemetry/api');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  const { statusCode = 500, message } = err;

  // Get current span for trace correlation
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  // Log error
  logger.error('Request error', {
    error: message,
    stack: err.stack,
    statusCode,
    method: req.method,
    path: req.path,
    traceId,
  });

  // Record error in span
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message }); // ERROR status
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message: message || 'Internal Server Error',
      statusCode,
      traceId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.path,
    },
  });
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
};
