.PHONY: help install test lint format docker-build docker-push docker-run docker-stop git-push clean

# Variables
DOCKER_IMAGE := thiagosg/otel-crud-api-nodejs
VERSION := 1.0.0
GIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo "dev")

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

test: ## Run tests with coverage
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

lint: ## Lint code
	npm run lint

lint-fix: ## Lint and fix code
	npm run lint:fix

format: ## Format code
	npm run format

dev: ## Run in development mode
	npm run dev

run-custom-otel: ## Run with custom OpenTelemetry collector (requires MySQL)
	@echo "Starting app with custom OpenTelemetry collector..."
	@echo "Make sure your OTEL collector is running and .env is configured"
	docker-compose up -d mysql
	@echo "Waiting for MySQL to be ready..."
	@sleep 5
	npm run start:custom-otel

# Docker commands
docker-build: ## Build Docker image
	docker build -t $(DOCKER_IMAGE):latest -t $(DOCKER_IMAGE):$(VERSION) -t $(DOCKER_IMAGE):$(GIT_SHA) .

docker-build-no-cache: ## Build Docker image without cache
	docker build --no-cache -t $(DOCKER_IMAGE):latest -t $(DOCKER_IMAGE):$(VERSION) -t $(DOCKER_IMAGE):$(GIT_SHA) .

docker-push: ## Push Docker image to registry
	docker push $(DOCKER_IMAGE):latest
	docker push $(DOCKER_IMAGE):$(VERSION)
	docker push $(DOCKER_IMAGE):$(GIT_SHA)

docker-build-push: docker-build docker-push ## Build and push Docker image

docker-run: ## Run Docker container locally
	docker run -d --name otel-nodejs-api \
		-p 8080:8080 \
		-e DB_HOST=host.docker.internal \
		-e OTEL_EXPORTER_OTLP_ENDPOINT=host.docker.internal:4320 \
		$(DOCKER_IMAGE):latest

docker-stop: ## Stop and remove Docker container
	docker stop otel-nodejs-api 2>/dev/null || true
	docker rm otel-nodejs-api 2>/dev/null || true

docker-logs: ## View Docker container logs
	docker logs -f otel-nodejs-api

# Docker Compose commands
up: ## Start all services with docker-compose
	docker-compose up -d

up-app-only: ## Start app with custom OTEL collector (using docker-compose.app-only.yml)
	@echo "Starting app and MySQL for use with custom OTEL collector..."
	@echo "Set OTEL_EXPORTER_OTLP_ENDPOINT env var to point to your collector"
	docker-compose -f docker-compose.app-only.yml up -d

down: ## Stop all services
	docker-compose down

down-v: ## Stop all services and remove volumes
	docker-compose down -v

logs: ## View docker-compose logs
	docker-compose logs -f

ps: ## List running containers
	docker-compose ps

restart: down up ## Restart all services

# Git commands
git-status: ## Show git status
	git status

git-add: ## Add all changes to git
	git add .

git-commit: ## Commit changes (use MESSAGE="your message")
	git commit -m "$(MESSAGE)"

git-push: ## Push to remote repository
	git push origin main

git-pull: ## Pull from remote repository
	git pull origin main

git-init: ## Initialize git repository and push to remote
	git add .
	git commit -m "Initial commit: Node.js Express CRUD API with OpenTelemetry"
	git push -u origin main

# Combined commands
build-test: lint test ## Run linting and tests

deploy: build-test docker-build-push ## Run tests, build and push Docker image

all: install lint test docker-build ## Install, test and build

# Cleanup
clean: ## Clean generated files
	rm -rf node_modules coverage dist build
	docker-compose down -v

clean-docker: ## Remove Docker images
	docker rmi $(DOCKER_IMAGE):latest $(DOCKER_IMAGE):$(VERSION) 2>/dev/null || true

# Development environment
dev-setup: install ## Setup development environment
	cp .env.example .env
	docker-compose up -d mysql alloy tempo mimir loki grafana

dev-teardown: ## Teardown development environment
	docker-compose down -v