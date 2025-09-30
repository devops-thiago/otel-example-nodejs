/**
 * Structured Logging with Pino
 * Integrates with OpenTelemetry for trace correlation
 */

const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.app.logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  transport:
    config.app.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: config.otel.serviceName,
    environment: config.otel.environment,
  },
});

module.exports = logger;
