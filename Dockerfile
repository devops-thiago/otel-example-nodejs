# Multi-stage Dockerfile for Node.js Express API

# Stage 1: Build stage
FROM node:26-alpine AS builder

# Metadata labels
LABEL maintainer="Thiago S.G. <thiagosg@example.com>"
LABEL org.opencontainers.image.title="OpenTelemetry Node.js CRUD API"
LABEL org.opencontainers.image.description="Node.js Express CRUD API with OpenTelemetry instrumentation"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/devops-thiago/otel-example-nodejs"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:26-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health/live || exit 1

# Start application with OpenTelemetry instrumentation
CMD ["node", "-r", "./src/instrumentation.js", "src/server.js"]