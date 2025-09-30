/**
 * Health Check Routes
 * Provides endpoints for health and readiness checks
 */

const express = require('express');
const { testConnection } = require('../database');
const config = require('../config');

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: config.otel.serviceName,
    version: config.otel.serviceVersion,
    environment: config.otel.environment,
  });
});

/**
 * GET /health/ready
 * Readiness check - includes database connectivity
 */
router.get('/ready', async (req, res) => {
  try {
    await testConnection();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'failed',
      },
      error: error.message,
    });
  }
});

/**
 * GET /health/live
 * Liveness check - simple ping
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
