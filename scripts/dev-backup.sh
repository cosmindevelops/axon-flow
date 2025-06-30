#!/usr/bin/env bash

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate environment
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}✗ docker is not installed${NC}"
  exit 1
fi

# Set docker-compose command (handle both docker-compose and docker compose)
if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

# Check if PostgreSQL is running and healthy
if ! $DOCKER_COMPOSE -f docker-compose.dev.yml ps postgres 2>/dev/null | grep -q "healthy"; then
  echo -e "${RED}✗ PostgreSQL is not running or not healthy${NC}"
  echo -e "${YELLOW}Run 'make setup' or '$DOCKER_COMPOSE -f docker-compose.dev.yml up -d postgres' first${NC}"
  exit 1
fi

# Create backup directory
BACKUP_DIR="./backups"
if ! mkdir -p "$BACKUP_DIR" 2>/dev/null; then
  echo -e "${RED}✗ Failed to create backup directory${NC}"
  exit 1
fi

# Generate timestamp with validation
TIMESTAMP=$(date +"%Y%m%d_%H%M%S" | tr -d '\n')
if [[ ! "$TIMESTAMP" =~ ^[0-9_]+$ ]]; then
  echo -e "${RED}✗ Invalid timestamp generated${NC}"
  exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/axon_flow_${TIMESTAMP}.sql"

echo -e "${YELLOW}Creating database backup...${NC}"

# Get database credentials from .env
if [ -f .env ]; then
  # Safely export only DB_ prefixed variables
  while IFS='=' read -r key value; do
    if [[ "$key" =~ ^DB_ ]] && [[ -n "$value" ]]; then
      export "$key=$value"
    fi
  done < <(grep -E '^DB_' .env || true)
fi

DB_USER=${DB_USER:-axon}
DB_NAME=${DB_NAME:-axon_flow}

# Validate database credentials
if [[ -z "$DB_USER" ]] || [[ -z "$DB_NAME" ]]; then
  echo -e "${RED}✗ Database credentials are not properly configured${NC}"
  exit 1
fi

# Create backup with error handling
if ! $DOCKER_COMPOSE -f docker-compose.dev.yml exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
  echo -e "${RED}✗ Failed to create database backup${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Check if backup file has content
if [ ! -s "$BACKUP_FILE" ]; then
  echo -e "${RED}✗ Backup file is empty${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Compress backup
if ! gzip "$BACKUP_FILE" 2>/dev/null; then
  echo -e "${RED}✗ Failed to compress backup file${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}.gz${NC}"

# Clean old backups (keep last 10)
echo -e "${YELLOW}Cleaning old backups...${NC}"

# Safely list and remove old backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "*.gz" -type f 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
  find "${BACKUP_DIR}" -name "*.gz" -type f -print0 2>/dev/null | \
    xargs -0 ls -t | \
    tail -n +11 | \
    while IFS= read -r file; do
      if [[ -f "$file" ]] && [[ "$file" =~ ^${BACKUP_DIR}/axon_flow_[0-9_]+\.sql\.gz$ ]]; then
        rm -f "$file"
        echo -e "${YELLOW}  Removed old backup: $(basename "$file")${NC}"
      fi
    done
fi

echo -e "${GREEN}✅ Backup completed!${NC}"