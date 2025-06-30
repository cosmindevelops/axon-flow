#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "    _    __  _____  _   _   _____ _     _____        __"
echo "   / \   \ \/ / _ \| \ | | |  ___| |   / _ \ \      / /"
echo "  / _ \   \  / | | |  \| | | |_  | |  | | | \ \ /\ / / "
echo " / ___ \  /  \ |_| | |\  | |  _| | |__| |_| |\ V  V /  "
echo "/_/   \_\/_/\_\___/|_| \_| |_|   |_____\___/  \_/\_/   "
echo -e "${NC}"
echo -e "${GREEN}Development Environment Setup${NC}"
echo "========================================"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
  local cmd=$1
  local required=$2
  local current=$3
  
  if [ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" = "$required" ]; then
    echo -e "${GREEN}✓${NC} $cmd version $current (>= $required)"
  else
    echo -e "${RED}✗${NC} $cmd version $current (requires >= $required)"
    return 1
  fi
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command_exists docker; then
  echo -e "${RED}✗ Docker is not installed${NC}"
  echo "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
  exit 1
else
  docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  check_version "Docker" "24.0.0" "$docker_version" || exit 1
fi

# Check Docker Compose
if ! command_exists docker compose && ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}✗ Docker Compose is not installed${NC}"
  exit 1
else
  echo -e "${GREEN}✓${NC} Docker Compose is available"
fi

# Set docker-compose command (handle both docker-compose and docker compose)
if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

# Check Node.js
if ! command_exists node; then
  echo -e "${RED}✗ Node.js is not installed${NC}"
  echo "  Please install Node.js 20.18.0 or later from https://nodejs.org"
  exit 1
else
  node_version=$(node --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  check_version "Node.js" "20.18.0" "$node_version" || exit 1
fi

# Check pnpm
if ! command_exists pnpm; then
  echo -e "${YELLOW}⚠ pnpm is not installed. Installing...${NC}"
  npm install -g pnpm@10.12.4
else
  pnpm_version=$(pnpm --version)
  check_version "pnpm" "10.12.4" "$pnpm_version" || {
    echo -e "${YELLOW}⚠ Updating pnpm...${NC}"
    npm install -g pnpm@10.12.4
  }
fi

# Check Git
if ! command_exists git; then
  echo -e "${RED}✗ Git is not installed${NC}"
  exit 1
else
  echo -e "${GREEN}✓${NC} Git is available"
fi

# Create .env file if not exists
if [ ! -f .env ]; then
  echo -e "\n${YELLOW}Creating .env file...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓${NC} Created .env file from .env.example"
else
  echo -e "${GREEN}✓${NC} .env file already exists"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Setup git hooks
echo -e "\n${YELLOW}Setting up git hooks...${NC}"
pnpm prepare

# Start services
echo -e "\n${YELLOW}Starting Docker services...${NC}"
$DOCKER_COMPOSE -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo -e "\n${YELLOW}Waiting for services to be healthy...${NC}"

# Function to wait for service
wait_for_service() {
  local service=$1
  local max_attempts=30
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if $DOCKER_COMPOSE -f docker-compose.dev.yml ps | grep -q "$service.*healthy"; then
      echo -e "${GREEN}✓${NC} $service is healthy"
      return 0
    fi
    
    attempt=$((attempt + 1))
    echo -ne "\r⏳ Waiting for $service... ($attempt/$max_attempts)"
    sleep 2
  done
  
  echo -e "\n${RED}✗ $service failed to become healthy${NC}"
  return 1
}

# Wait for each service
wait_for_service "postgres" || exit 1
wait_for_service "rabbitmq" || exit 1
wait_for_service "redis" || exit 1

# Build packages
echo -e "\n${YELLOW}Building packages...${NC}"
pnpm build

# Run tests to verify setup
echo -e "\n${YELLOW}Running verification tests...${NC}"
pnpm test

# Success message
echo -e "\n${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "Available services:"
echo "  • PostgreSQL:       postgresql://axon:axon_dev_2025@localhost:5432/axon_flow"
echo "  • Adminer:          http://localhost:8080"
echo "  • RabbitMQ:         amqp://axon:axon_dev_2025@localhost:5672/axon"
echo "  • RabbitMQ UI:      http://localhost:15672 (user: axon, pass: axon_dev_2025)"
echo "  • Redis:            redis://:axon_dev_2025@localhost:6379"
echo "  • Redis Commander:  http://localhost:8081"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm dev' to start development"
echo "  2. Check docs/setup-guide.md for more information"
echo ""