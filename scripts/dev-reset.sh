#!/usr/bin/env bash

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Set docker-compose command (handle both docker-compose and docker compose)
if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

echo -e "${YELLOW}⚠️  WARNING: This will delete all local data!${NC}"
echo "This includes:"
echo "  - PostgreSQL data"
echo "  - RabbitMQ queues and messages"
echo "  - Redis cache"
echo "  - Node modules and build artifacts"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Reset cancelled."
  exit 0
fi

echo -e "${YELLOW}Stopping all services...${NC}"
$DOCKER_COMPOSE -f docker-compose.dev.yml down -v

echo -e "${YELLOW}Removing node_modules...${NC}"
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

echo -e "${YELLOW}Removing build artifacts...${NC}"
find . -name "dist" -type d -prune -exec rm -rf '{}' +
find . -name ".turbo" -type d -prune -exec rm -rf '{}' +
find . -name "coverage" -type d -prune -exec rm -rf '{}' +
find . -name ".next" -type d -prune -exec rm -rf '{}' +

echo -e "${YELLOW}Removing lock files...${NC}"
rm -f pnpm-lock.yaml

echo -e "${YELLOW}Cleaning pnpm store...${NC}"
pnpm store prune

echo -e "${GREEN}✅ Reset completed!${NC}"
echo ""
echo "To start fresh, run:"
echo "  ./scripts/dev-setup.sh"