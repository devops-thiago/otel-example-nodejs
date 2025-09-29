/**
 * OpenTelemetry Instrumentation Configuration
 *
 * This file must be required BEFORE any other application code
 * Usage: node -r ./src/instrumentation.js src/server.js
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT,
} = require('@opentelemetry/semantic-conventions');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { MySQL2Instrumentation } = require('@opentelemetry/instrumentation-mysql2');

// Load environment variables
require('dotenv').config();

// Configuration
const config = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'otel-example-nodejs-api',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4320',
  enableTracing: process.env.OTEL_ENABLE_TRACING !== 'false',
  enableMetrics: process.env.OTEL_ENABLE_METRICS !== 'false',
};

console.log('🔧 Initializing OpenTelemetry instrumentation...', {
  serviceName: config.serviceName,
  serviceVersion: config.serviceVersion,
  environment: config.environment,
  otlpEndpoint: config.otlpEndpoint,
  enableTracing: config.enableTracing,
  enableMetrics: config.enableMetrics,
});

// Create resource with service information
const resource = new Resource({
  [ATTR_SERVICE_NAME]: config.serviceName,
  [ATTR_SERVICE_VERSION]: config.serviceVersion,
  [ATTR_DEPLOYMENT_ENVIRONMENT]: config.environment,
});

// Configure trace exporter
const traceExporter = config.enableTracing
  ? new OTLPTraceExporter({
      url: `http://${config.otlpEndpoint}`,
    })
  : undefined;

// Configure metric exporter
const metricReader = config.enableMetrics
  ? new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `http://${config.otlpEndpoint}`,
      }),
      exportIntervalMillis: 10000, // Export every 10 seconds
    })
  : undefined;

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    // Auto-instrumentations with custom configuration
    getNodeAutoInstrumentations({
      // Disable some auto-instrumentations that we configure manually
      '@opentelemetry/instrumentation-express': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-mysql2': {
        enabled: false,
      },
      // Configure other instrumentations
      '@opentelemetry/instrumentation-fs': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-dns': {
        enabled: true,
      },
    }),
    // Manual instrumentation with custom configuration
    new HttpInstrumentation({
      requestHook: (span, request) => {
        span.setAttribute('http.request.body.size', request.headers['content-length'] || 0);
      },
      responseHook: (span, response) => {
        span.setAttribute('http.response.body.size', response.headers['content-length'] || 0);
      },
      ignoreIncomingRequestHook: (request) => {
        // Ignore health check and metrics endpoints
        const url = request.url || '';
        return url.includes('/health') || url.includes('/metrics');
      },
    }),
    new ExpressInstrumentation({
      requestHook: (span, requestInfo) => {
        span.setAttribute('express.route', requestInfo.route || 'unknown');
        span.setAttribute('express.method', requestInfo.request.method);
      },
    }),
    new MySQL2Instrumentation({
      enhancedDatabaseReporting: true,
      responseHook: (span, responseInfo) => {
        if (responseInfo.error) {
          span.setAttribute('db.error', responseInfo.error.message);
        }
      },
    }),
  ],
});

// Start the SDK
try {
  sdk.start();
  console.log('✅ OpenTelemetry instrumentation started successfully');
} catch (error) {
  console.error('❌ Error initializing OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('🛑 OpenTelemetry shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down OpenTelemetry:', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
