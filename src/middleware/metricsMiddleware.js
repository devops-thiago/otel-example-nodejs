/**
 * Metrics Middleware
 * Tracks HTTP request metrics including duration and active requests
 */

const { recordHttpRequest, trackActiveHttpRequests } = require('../metrics');
const logger = require('../logger');

/**
 * Middleware to record HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';
  const method = req.method;

  // Track active requests
  trackActiveHttpRequests(1, method, route);

  // Hook into response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record metrics
    recordHttpRequest(duration, method, route, statusCode);

    // Log request
    logger.info('HTTP request completed', {
      method,
      route,
      statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    // Decrement active requests
    trackActiveHttpRequests(-1, method, route);
  });

  next();
};

module.exports = metricsMiddleware;
