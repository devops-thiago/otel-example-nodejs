/**
 * Server Entry Point
 * Starts the Express server and initializes database
 */

const app = require('./app');
const config = require('./config');
const logger = require('./logger');
const { testConnection, initializeSchema, closePool } = require('./database');

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('Starting server...', {
      environment: config.app.env,
      port: config.server.port,
      service: config.otel.serviceName,
    });

    // Test database connection
    logger.info('Testing database connection...');
    await testConnection();

    // Initialize database schema
    logger.info('Initializing database schema...');
    await initializeSchema();

    // Start Express server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info('🚀 Server started successfully', {
        host: config.server.host,
        port: config.server.port,
        environment: config.app.env,
        service: config.otel.serviceName,
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closePool();
          logger.info('Database connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the server
startServer();
