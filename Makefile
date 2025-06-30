.PHONY: help setup dev test build clean reset logs backup

# Default target
help:
	@echo "Axon Flow Development Commands"
	@echo "=============================="
	@echo ""
	@echo "  make setup    - Initial setup for new developers"
	@echo "  make dev      - Start development environment"
	@echo "  make test     - Run all tests"
	@echo "  make build    - Build all packages"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make reset    - Reset entire environment"
	@echo "  make logs     - Tail all service logs"
	@echo "  make backup   - Backup local database"
	@echo ""

# Setup development environment
setup:
	@./scripts/dev-setup.sh

# Start development
dev:
	@docker compose -f docker-compose.dev.yml up -d
	@pnpm dev

# Run tests
test:
	@pnpm test

# Build all packages
build:
	@pnpm build

# Clean build artifacts
clean:
	@pnpm clean
	@find . -name "dist" -type d -prune -exec rm -rf '{}' +
	@find . -name ".turbo" -type d -prune -exec rm -rf '{}' +

# Reset environment
reset:
	@./scripts/dev-reset.sh

# Show logs
logs:
	@./scripts/dev-logs.sh

# Backup database
backup:
	@./scripts/dev-backup.sh

# Quick commands
up:
	@docker compose -f docker-compose.dev.yml up -d

down:
	@docker compose -f docker-compose.dev.yml down

ps:
	@docker compose -f docker-compose.dev.yml ps

# Install dependencies
install:
	@pnpm install

# Format code
format:
	@pnpm format

# Lint code
lint:
	@pnpm lint

# Type check
typecheck:
	@pnpm typecheck