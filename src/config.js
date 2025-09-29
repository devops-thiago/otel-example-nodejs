/**
 * Application Configuration
 * Centralizes all environment variable management
 */

require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    host: process.env.SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.SERVER_PORT || '8080', 10),
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'appuser',
    password: process.env.DB_PASSWORD || 'apppassword',
    database: process.env.DB_NAME || 'otel_example',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    waitForConnections: true,
    queueLimit: 0,
  },

  // Application Configuration
  app: {
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // OpenTelemetry Configuration
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'otel-example-nodejs-api',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    environment: process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || 'development',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4320',
    enableTracing: process.env.OTEL_ENABLE_TRACING !== 'false',
    enableMetrics: process.env.OTEL_ENABLE_METRICS !== 'false',
    enableLogging: process.env.OTEL_ENABLE_LOGGING !== 'false',
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = {
    'server.port': config.server.port,
    'database.host': config.database.host,
    'database.database': config.database.database,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }
};

validateConfig();

module.exports = config;
