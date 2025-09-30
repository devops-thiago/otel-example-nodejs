/**
 * Custom OpenTelemetry Metrics
 * Provides application-specific metrics for HTTP, process, and database operations
 */

const { metrics } = require('@opentelemetry/api');
const config = require('./config');

// Get meter instance
const meter = metrics.getMeter(config.otel.serviceName, config.otel.serviceVersion);

// HTTP Metrics
const httpRequestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

const httpRequestsTotal = meter.createCounter('http.server.requests.total', {
  description: 'Total number of HTTP requests',
  unit: '1',
});

const httpRequestsActive = meter.createUpDownCounter('http.server.requests.active', {
  description: 'Number of active HTTP requests',
  unit: '1',
});

// Database Metrics
const dbQueryDuration = meter.createHistogram('db.query.duration', {
  description: 'Database query duration in milliseconds',
  unit: 'ms',
});

const dbQueriesTotal = meter.createCounter('db.queries.total', {
  description: 'Total number of database queries',
  unit: '1',
});

const dbConnectionsActive = meter.createUpDownCounter('db.connections.active', {
  description: 'Number of active database connections',
  unit: '1',
});

const dbErrors = meter.createCounter('db.errors.total', {
  description: 'Total number of database errors',
  unit: '1',
});

// Process Metrics
const processMemoryUsage = meter.createObservableGauge('process.memory.usage', {
  description: 'Process memory usage in bytes',
  unit: 'bytes',
});

const processCpuUsage = meter.createObservableGauge('process.cpu.usage', {
  description: 'Process CPU usage percentage',
  unit: '1',
});

const processUptime = meter.createObservableCounter('process.uptime', {
  description: 'Process uptime in seconds',
  unit: 's',
});

// Register process metrics collectors
processMemoryUsage.addCallback((observableResult) => {
  const memUsage = process.memoryUsage();
  observableResult.observe(memUsage.heapUsed, { type: 'heap_used' });
  observableResult.observe(memUsage.heapTotal, { type: 'heap_total' });
  observableResult.observe(memUsage.rss, { type: 'rss' });
  observableResult.observe(memUsage.external, { type: 'external' });
});

processCpuUsage.addCallback((observableResult) => {
  const cpuUsage = process.cpuUsage();
  observableResult.observe(cpuUsage.user / 1000000, { type: 'user' }); // Convert to seconds
  observableResult.observe(cpuUsage.system / 1000000, { type: 'system' });
});

processUptime.addCallback((observableResult) => {
  observableResult.observe(process.uptime());
});

/**
 * Record HTTP request metrics
 * @param {number} duration - Request duration in milliseconds
 * @param {string} method - HTTP method
 * @param {string} route - Route path
 * @param {number} statusCode - HTTP status code
 */
const recordHttpRequest = (duration, method, route, statusCode) => {
  const attributes = {
    'http.method': method,
    'http.route': route,
    'http.status_code': statusCode,
  };

  httpRequestDuration.record(duration, attributes);
  httpRequestsTotal.add(1, attributes);
};

/**
 * Track active HTTP requests
 * @param {number} delta - Change in active requests (+1 or -1)
 * @param {string} method - HTTP method
 * @param {string} route - Route path
 */
const trackActiveHttpRequests = (delta, method, route) => {
  httpRequestsActive.add(delta, {
    'http.method': method,
    'http.route': route,
  });
};

/**
 * Record database query metrics
 * @param {number} duration - Query duration in milliseconds
 * @param {string} operation - Database operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} table - Table name
 * @param {boolean} success - Query success status
 */
const recordDbQuery = (duration, operation, table, success = true) => {
  const attributes = {
    'db.operation': operation,
    'db.table': table,
    'db.success': success,
  };

  dbQueryDuration.record(duration, attributes);
  dbQueriesTotal.add(1, attributes);

  if (!success) {
    dbErrors.add(1, attributes);
  }
};

/**
 * Track active database connections
 * @param {number} delta - Change in active connections (+1 or -1)
 */
const trackActiveDbConnections = (delta) => {
  dbConnectionsActive.add(delta);
};

module.exports = {
  // HTTP Metrics
  recordHttpRequest,
  trackActiveHttpRequests,

  // Database Metrics
  recordDbQuery,
  trackActiveDbConnections,

  // Meter instance for custom metrics
  meter,
};
