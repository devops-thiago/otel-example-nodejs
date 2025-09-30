# OpenTelemetry Node.js Example

[![CI](https://img.shields.io/github/actions/workflow/status/devops-thiago/otel-example-nodejs/ci.yml?branch=main&label=CI)](https://github.com/devops-thiago/otel-example-nodejs/actions)
[![Node.js Version](https://img.shields.io/badge/node-18%2B-339933?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/github/license/devops-thiago/otel-example-nodejs)](LICENSE)
[![Codecov](https://img.shields.io/codecov/c/github/devops-thiago/otel-example-nodejs?label=coverage)](https://app.codecov.io/gh/devops-thiago/otel-example-nodejs)
[![Sonar Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=devops-thiago_otel-example-nodejs&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=devops-thiago_otel-example-nodejs)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=devops-thiago_otel-example-nodejs&metric=coverage)](https://sonarcloud.io/summary/new_code?id=devops-thiago_otel-example-nodejs)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-enabled-blue?logo=opentelemetry)](https://opentelemetry.io)
[![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)](https://www.docker.com)
[![Docker Hub](https://img.shields.io/docker/v/thiagosg/otel-crud-api-nodejs?logo=docker&label=Docker%20Hub)](https://hub.docker.com/r/thiagosg/otel-crud-api-nodejs)
[![Docker Pulls](https://img.shields.io/docker/pulls/thiagosg/otel-crud-api-nodejs)](https://hub.docker.com/r/thiagosg/otel-crud-api-nodejs)

A production-ready Node.js Express REST API with comprehensive OpenTelemetry instrumentation, featuring distributed tracing, metrics collection, and structured logging. Built with clean architecture principles and designed for cloud-native deployments.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Observability](#observability)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)

## ✨ Features

- **🚀 Express Framework** - Fast, minimalist web framework for Node.js
- **📊 Full Observability** - Distributed tracing, metrics, and structured logging
- **🔌 OpenTelemetry Native** - Built-in OTLP exporter support
- **🏗️ Clean Architecture** - Repository pattern with separation of concerns
- **🐳 Docker Ready** - Multi-stage Dockerfile with security best practices
- **🔒 Security First** - Non-root user, Helmet middleware, input validation
- **🧪 Well Tested** - Comprehensive test coverage with Jest
- **💾 MySQL Integration** - Connection pooling with proper instrumentation
- **📝 Type Safety** - JSDoc type hints with ESLint enforcement
- **💅 Code Quality** - ESLint + Prettier for consistent code style

## 📚 Prerequisites

- Node.js 18+ (for local development)
- npm (Node package manager)
- Docker & Docker Compose
- MySQL 8.0+ (or use the provided docker-compose)
- OpenTelemetry Collector (optional - included in full setup)

## 🚀 Quick Start

### Option 1: Full Stack (App + Database + Observability)

```bash
# Clone the repository
git clone https://github.com/devops-thiago/otel-example-nodejs.git
cd otel-example-nodejs

# Start everything with docker-compose
docker-compose up -d

# Check if services are running
docker-compose ps
```

**Access points:**
- API: http://localhost:8080
- Health: http://localhost:8080/health
- Grafana: http://localhost:3000 (admin/admin)
- Alloy UI: http://localhost:12345

### Option 2: Run Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (if using Docker MySQL)
docker-compose up -d mysql

# Run the application
npm start
# Or with hot-reload for development:
npm run dev
```

## 🚢 Deployment Options

### Using Your Own OpenTelemetry Collector

If you already have an OpenTelemetry infrastructure:

```bash
# Option 1: Using Makefile (starts MySQL + app locally)
make run-custom-otel

# Option 2: Using npm directly
npm run start:custom-otel

# Option 3: Using dedicated docker-compose file (recommended)
docker-compose -f docker-compose.app-only.yml up -d

# Option 4: Using main docker-compose (starts app + MySQL only)
docker-compose up -d app mysql
```

**Required environment variables:**
```bash
# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=your-collector:4320
OTEL_SERVICE_NAME=otel-example-nodejs-api

# Database Configuration
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-nodejs-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-nodejs-api
  template:
    metadata:
      labels:
        app: otel-nodejs-api
    spec:
      containers:
      - name: api
        image: thiagosg/otel-crud-api-nodejs:latest
        ports:
        - containerPort: 8080
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "otel-collector:4320"
        - name: DB_HOST
          value: "mysql-service"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
```

### Using Pre-built Docker Image

```bash
# Pull from Docker Hub
docker pull thiagosg/otel-crud-api-nodejs:latest

# Run with custom environment
docker run -d \
  -p 8080:8080 \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=your-collector:4320 \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-user \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=your-database \
  thiagosg/otel-crud-api-nodejs:latest
```

### Building Docker Image

```bash
# Build the image locally
docker build -t otel-example-nodejs:latest .

# Build with version information
docker build \
  --build-arg VERSION=1.0.0 \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  -t otel-example-nodejs:latest .

# Build multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t otel-example-nodejs:latest .
```

## 📖 API Documentation

### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/health/ready` | Readiness check (includes DB connectivity) |
| GET | `/health/live` | Liveness check |

### User API

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/users` | List all users (with pagination) | - |
| GET | `/api/users/:id` | Get user by ID | - |
| POST | `/api/users` | Create new user | `{"name": "John", "email": "john@example.com", "age": 30}` |
| PUT | `/api/users/:id` | Update user | `{"name": "John Updated", "age": 31}` |
| DELETE | `/api/users/:id` | Delete user | - |

### Example Requests

```bash
# Create a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'

# Get all users with pagination
curl http://localhost:8080/api/users?limit=10&offset=0

# Get user by ID
curl http://localhost:8080/api/users/1

# Update user
curl -X PUT http://localhost:8080/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated", "age": 31}'

# Delete user
curl -X DELETE http://localhost:8080/api/users/1
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| **OpenTelemetry** | | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `localhost:4320` |
| `OTEL_SERVICE_NAME` | Service name for telemetry | `otel-example-nodejs-api` |
| `OTEL_SERVICE_VERSION` | Service version | `1.0.0` |
| `OTEL_ENVIRONMENT` | Environment name | `development` |
| `OTEL_ENABLE_TRACING` | Enable distributed tracing | `true` |
| `OTEL_ENABLE_METRICS` | Enable metrics collection | `true` |
| **Database** | | |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `appuser` |
| `DB_PASSWORD` | MySQL password | `apppassword` |
| `DB_NAME` | MySQL database name | `otel_example` |
| `DB_CONNECTION_LIMIT` | Connection pool size | `10` |
| **Server** | | |
| `SERVER_HOST` | API server host | `0.0.0.0` |
| `SERVER_PORT` | API server port | `8080` |
| `NODE_ENV` | Node environment | `development` |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## 🔍 Observability

### OpenTelemetry Metrics

The application exports the following custom metrics:

**HTTP Metrics:**
- `http.server.request.duration` - Request duration histogram
- `http.server.requests.total` - Total request counter
- `http.server.requests.active` - Active requests gauge

**Database Metrics:**
- `db.query.duration` - Query duration histogram
- `db.queries.total` - Total queries counter
- `db.connections.active` - Active connections gauge
- `db.errors.total` - Database error counter

**Process Metrics:**
- `process.memory.usage` - Memory usage (heap, RSS, external)
- `process.cpu.usage` - CPU usage (user, system)
- `process.uptime` - Process uptime

### Grafana Dashboards

Access Grafana at http://localhost:3000 (admin/admin) to view:
- **Distributed Traces** - Tempo integration
- **Metrics** - Mimir/Prometheus metrics
- **Logs** - Loki log aggregation

### Example Queries

**PromQL (Mimir):**
```promql
# Request rate
rate(http_server_requests_total[5m])

# Average request duration
histogram_quantile(0.95, rate(http_server_request_duration_bucket[5m]))

# Database errors
rate(db_errors_total[5m])
```

**TraceQL (Tempo):**
```traceql
# Find slow traces
{ duration > 1s }

# Find traces with errors
{ status = error }
```

**LogQL (Loki):**
```logql
# All logs
{service="otel-example-nodejs-api"}

# Error logs
{service="otel-example-nodejs-api"} |= "error"
```

## 🏗️ Project Structure

```
.
├── src/
│   ├── instrumentation.js      # OpenTelemetry setup (loaded first!)
│   ├── server.js               # Server entry point
│   ├── app.js                  # Express configuration
│   ├── config.js               # Configuration management
│   ├── database.js             # MySQL connection pool
│   ├── logger.js               # Structured logging (Pino)
│   ├── metrics.js              # Custom OpenTelemetry metrics
│   ├── middleware/             # Express middleware
│   │   ├── metricsMiddleware.js
│   │   └── errorHandler.js
│   ├── repositories/           # Data access layer
│   │   └── userRepository.js
│   ├── routes/                 # API routes
│   │   ├── userRoutes.js
│   │   └── healthRoutes.js
│   └── validators/             # Request validation (Joi)
│       └── userValidator.js
├── tests/
│   ├── integration/            # Integration tests (with DB)
│   │   ├── users.test.js
│   │   └── health.test.js
│   └── unit/                   # Unit tests (isolated)
│       ├── config.test.js
│       ├── logger.test.js
│       ├── errorHandler.test.js
│       ├── metricsMiddleware.test.js
│       ├── metrics.test.js
│       ├── app.test.js
│       ├── database.test.js
│       ├── healthRoutes.test.js
│       ├── userValidator.test.js
│       └── userRepository.test.js
├── config/                     # Observability stack configs
│   ├── alloy.alloy            # Grafana Alloy configuration
│   ├── tempo.yaml             # Tempo tracing backend
│   ├── mimir.yaml             # Mimir metrics backend
│   ├── loki.yaml              # Loki logging backend
│   └── grafana/               # Grafana provisioning
├── docker-compose.yml          # Full stack deployment
├── docker-compose.app-only.yml # App + DB only (for custom OTEL)
├── Dockerfile                  # Multi-stage Docker build
├── package.json                # Dependencies & scripts
├── jest.config.js              # Test configuration (all tests)
├── jest.unit.config.js         # Unit test configuration
├── jest.integration.config.js  # Integration test configuration
├── Makefile                    # Development commands
└── README.md                   # This file
```

## 🛠️ Development

### Available Commands

```bash
# Install dependencies
npm install
# or: make install

# Development mode (with hot-reload)
npm run dev
# or: make dev

# Run tests
npm test
# or: make test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
# or: make lint

# Format code
npm run format
# or: make format

# Docker operations
make docker-build        # Build Docker image
make docker-build-push   # Build and push to Docker Hub
make up                  # Start all services
make down                # Stop all services
make logs                # View logs
```

### Development Workflow

1. **Make changes** to the code
2. **Run linter**: `npm run lint`
3. **Run tests**: `npm test`
4. **Test locally**: `npm run dev`
5. **Commit changes**: Use conventional commits
6. **Push**: CI will run automatically

### Code Quality

- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **Jest** - Testing framework with separate unit/integration configs
- **Supertest** - HTTP API testing
- **Coverage** - 80% statements and functions for unit tests

## 🧪 Testing

### Test Commands

```bash
# Run only unit tests with coverage (CI default)
npm run test:unit

# Run only integration tests (requires MySQL)
npm run test:integration

# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch
npm run test:watch:unit

# View coverage report
open coverage/lcov-report/index.html
```

### Test Structure

The project uses **Jest** with separate configurations for different test types:

#### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual modules and functions in isolation
- **Coverage Target**: 80% statements and functions
- **Dependencies**: Fully mocked, no external services required
- **Run in CI**: ✅ Yes (fast and reliable)
- **Files**: 
  - `config.test.js` - Configuration loading and validation
  - `logger.test.js` - Logger initialization and settings
  - `errorHandler.test.js` - Error handling middleware
  - `metricsMiddleware.test.js` - Metrics collection
  - `metrics.test.js` - OpenTelemetry metrics
  - `app.test.js` - Express app configuration
  - `database.test.js` - Database connection pool
  - `healthRoutes.test.js` - Health check endpoints
  - `userValidator.test.js` - Request validation
  - `userRepository.test.js` - Data access layer

#### Integration Tests (`tests/integration/`)
- **Purpose**: Test full API endpoints with real database
- **Dependencies**: Requires MySQL database connection
- **Run in CI**: ❌ No (requires service dependencies)
- **Run Locally**: Use `docker-compose up -d mysql` first
- **Files**:
  - `users.test.js` - User CRUD operations
  - `health.test.js` - Health check endpoints

### Coverage Requirements

- **Statements**: 80%
- **Functions**: 80%
- **Branches**: 70%
- **Lines**: 70%

### Running Tests Locally

```bash
# Unit tests (no dependencies needed)
npm run test:unit

# Integration tests (start MySQL first)
docker-compose up -d mysql
npm run test:integration

# All tests together
docker-compose up -d mysql
npm test
```

## 📦 Docker

### Multi-stage Dockerfile

The Docker image is built using a multi-stage approach:
1. **Builder stage** - Install dependencies
2. **Production stage** - Copy only necessary files, run as non-root user

**Image size**: ~250MB (Alpine-based)

### Docker Compose Services

- **app** - Node.js application
- **mysql** - MySQL database
- **tempo** - Distributed tracing backend
- **mimir** - Metrics storage
- **loki** - Log aggregation
- **alloy** - OpenTelemetry collector
- **grafana** - Visualization
- **minio** - Object storage for Tempo/Mimir/Loki

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Tests pass (`npm test`)
- Code is linted (`npm run lint`)
- Code is formatted (`npm run format`)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

