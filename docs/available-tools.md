# Available Development Tools

This document lists all development tools and services available in the Axon Flow development environment.

## Database Management

### PostgreSQL + pgvector

- **URL:** `postgresql://axon:axon_dev_2025@localhost:5432/axon_flow`
- **Host:** localhost
- **Port:** 5432
- **Database:** axon_flow
- **Username:** axon
- **Password:** axon_dev_2025
- **Features:** Full-text search, vector embeddings support via pgvector extension

### Adminer (Database UI)

- **URL:** http://localhost:8080
- **System:** PostgreSQL
- **Server:** postgres (when running in Docker) or localhost:5432
- **Username:** axon
- **Password:** axon_dev_2025
- **Database:** axon_flow

## Message Queue

### RabbitMQ

- **AMQP URL:** `amqp://axon:axon_dev_2025@localhost:5672/axon`
- **Host:** localhost
- **Port:** 5672
- **Virtual Host:** axon
- **Username:** axon
- **Password:** axon_dev_2025

### RabbitMQ Management UI

- **URL:** http://localhost:15672
- **Username:** axon
- **Password:** axon_dev_2025
- **Features:** Queue monitoring, message rates, connections overview

## Caching & Sessions

### Redis

- **URL:** `redis://:axon_dev_2025@localhost:6379`
- **Host:** localhost
- **Port:** 6379
- **Password:** axon_dev_2025
- **Max Memory:** 256MB
- **Eviction Policy:** allkeys-lru

### Redis Commander (Redis UI)

- **URL:** http://localhost:8081
- **Features:** Key browsing, data visualization, TTL management

## Development Commands

### Quick Commands

```bash
# Initial setup
make setup

# Start development
make dev

# View logs
make logs

# Run tests
make test

# Build all packages
make build

# Reset environment
make reset

# Backup database
make backup
```

### Docker Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View service status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f [service-name]
```

### Package Management

```bash
# Install dependencies
pnpm install

# Add dependency to specific package
pnpm add <package> --filter @axon-flow/<package-name>

# Run script in all packages
pnpm -r <script-name>

# Run script in specific package
pnpm --filter @axon-flow/<package-name> <script-name>
```

## Monitoring & Debugging

### Service Health Checks

- PostgreSQL: `pg_isready -U axon -d axon_flow`
- RabbitMQ: `rabbitmq-diagnostics ping`
- Redis: `redis-cli ping`

### Log Locations

- PostgreSQL logs: `docker-compose -f docker-compose.dev.yml logs postgres`
- RabbitMQ logs: `docker-compose -f docker-compose.dev.yml logs rabbitmq`
- Redis logs: `docker-compose -f docker-compose.dev.yml logs redis`

## CI/CD

### GitHub Actions

- Workflow file: `.github/workflows/ci.yml`
- Triggers: Push to main/develop, Pull requests
- Jobs: Lint, Type Check, Test, Build, Security Scan

### Turbo Cache

- Cache location: `node_modules/.cache/turbo`
- Clear cache: `pnpm clean`
- Remote caching: Disabled (local only)

## Code Quality

### Linting & Formatting

- ESLint: `pnpm lint`
- Prettier: `pnpm format`
- Pre-commit hooks: Automatically run via Husky

### Testing

- Run all tests: `pnpm test`
- Watch mode: `pnpm test:watch`
- Coverage: Reports generated in `coverage/` directory

## Environment Variables

All environment variables are defined in `.env` file (copy from `.env.example`):

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=axon
DB_PASSWORD=axon_dev_2025
DB_NAME=axon_flow

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=axon
RABBITMQ_PASS=axon_dev_2025
RABBITMQ_VHOST=axon

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=axon_dev_2025

# Node Environment
NODE_ENV=development
```

## Troubleshooting

### Port Conflicts

If you encounter port conflicts, update the port numbers in `.env` file and restart services.

### Service Connection Issues

1. Check service health: `docker-compose -f docker-compose.dev.yml ps`
2. Restart specific service: `docker-compose -f docker-compose.dev.yml restart <service>`
3. Check logs: `docker-compose -f docker-compose.dev.yml logs <service>`

### Clean Slate

For a complete reset: `make reset` (WARNING: This will delete all local data)
