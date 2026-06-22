/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const healthRoutes = require('./routes/healthRoutes');
const logger = require('./logger');

// Create Express app
const app = express();

// Trust proxy for correct IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS middleware — restrict to an explicit allowlist via CORS_ORIGIN
// (comma-separated origins). Defaults to same-origin only rather than a
// permissive wildcard (CodeQL: js/cors-permissive-configuration).
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : false;
app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Custom metrics middleware
app.use(metricsMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'OpenTelemetry Node.js Example API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
    },
  });
});

app.use('/health', healthRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
