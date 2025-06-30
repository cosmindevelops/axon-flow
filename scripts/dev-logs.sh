#!/usr/bin/env bash

set -euo pipefail

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

# Set docker-compose command (handle both docker-compose and docker compose)
if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

# Default to all services
SERVICE=${1:-}

echo -e "${BLUE}📋 Tailing logs...${NC}"
echo "Press Ctrl+C to stop"
echo ""

if [ -n "$SERVICE" ]; then
  # Tail specific service
  $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f "$SERVICE"
else
  # Tail all services
  $DOCKER_COMPOSE -f docker-compose.dev.yml logs -f
fi