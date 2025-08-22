# @axon/config

Configuration management package for Axon Flow - providing type-safe, validated configuration handling with support for multiple environments and sources.

## Features

- **Type-Safe Configuration**: Full TypeScript support with strict typing
- **Zod Validation**: Runtime validation of all configuration values
- **Multiple Sources**: Support for environment variables, files, and programmatic configuration
- **Environment-Specific Builders**: Specialized builders for development, production, and test environments
- **Repository Pattern**: Pluggable configuration sources through repository abstractions
- **Caching Support**: Built-in caching mechanisms for improved performance
- **Builder Pattern**: Fluent API for configuration construction

## Installation

```bash
pnpm add @axon/config
```

## Quick Start

```typescript
import { ConfigBuilderFactory } from "@axon/config";

// Create environment-specific configuration
const config = ConfigBuilderFactory
  .forEnvironment(process.env.NODE_ENV)
  .build();

// Access typed configuration values
const dbUrl = config.database.url;
const apiPort = config.service.port;
```

## Architecture

### Builders

Configuration builders provide a fluent API for constructing configuration objects:

- `ConfigBuilder` - Base builder with core functionality
- `DevelopmentConfigBuilder` - Development-specific optimizations
- `ProductionConfigBuilder` - Production-ready configuration with security defaults
- `TestConfigBuilder` - Test environment configuration with mocks and overrides
- `ConfigBuilderFactory` - Factory for creating environment-appropriate builders

### Repositories

Repository pattern implementations for different configuration sources:

- `EnvironmentConfigRepository` - Environment variable-based configuration
- `FileConfigRepository` - File-based configuration (JSON, YAML)
- `MemoryConfigRepository` - In-memory configuration for testing
- `CompositeConfigRepository` - Combines multiple configuration sources
- `CachedConfigRepository` - Adds caching layer to any repository
- `LocalStorageConfigRepository` - Browser localStorage-based configuration

### Schemas

Zod validation schemas for all configuration domains:

- `AuthSchemas` - Authentication and authorization configuration
- `DatabaseSchemas` - Database connection and settings
- `RabbitMQSchemas` - Message broker configuration
- `RedisSchemas` - Redis cache and session configuration
- `ServiceSchemas` - Service-specific settings
- `BaseSchemas` - Base configuration schemas
- `ConfigSchemas` - Complete configuration schemas

### Types

TypeScript type definitions for configuration objects and interfaces.

### Utils

Utility functions and classes:

- `PlatformDetector` - Runtime platform detection
- `ObjectPool` - Object pooling for performance optimization
- `ValidationCache` - Caching for expensive validation operations

## Usage Examples

### Environment-Specific Configuration

```typescript
import { ConfigBuilderFactory } from "@axon/config";

// Production configuration with security defaults
const prodConfig = ConfigBuilderFactory
  .forEnvironment("production")
  .withDefaults({
    service: { port: 3000 },
    security: { enabled: true }
  })
  .build();

// Development configuration with debug options
const devConfig = ConfigBuilderFactory
  .forEnvironment("development")
  .withDefaults({
    logging: { level: "debug" },
    development: { hotReload: true }
  })
  .build();
```

### Custom Repository Configuration

```typescript
import { 
  CompositeConfigRepository,
  EnvironmentConfigRepository,
  FileConfigRepository
} from "@axon/config";

// Combine multiple configuration sources
const repository = new CompositeConfigRepository([
  new FileConfigRepository("./config.json"),
  new EnvironmentConfigRepository(),
]);

const config = ConfigBuilderFactory
  .create()
  .withRepository(repository)
  .build();
```

### Validation and Error Handling

```typescript
import { ConfigBuilder } from "@axon/config";
import { z } from "zod";

try {
  const config = new ConfigBuilder()
    .withSchema(z.object({
      database: z.object({
        url: z.string().url(),
        maxConnections: z.number().min(1).max(100)
      })
    }))
    .build();
} catch (error) {
  // Handle validation errors
  console.error("Configuration validation failed:", error);
}
```

## API Reference

### ConfigBuilderFactory

Static factory methods for creating configuration builders:

- `forEnvironment(env: string)` - Create environment-specific builder
- `create()` - Create base configuration builder

### ConfigBuilder

Core configuration builder with fluent API:

- `withDefaults(defaults: Partial<Config>)` - Set default values
- `withRepository(repository: IConfigRepository)` - Use custom repository
- `withSchema(schema: ZodSchema)` - Set validation schema
- `build()` - Build and validate final configuration

### Repository Interfaces

All repositories implement `IConfigRepository`:

```typescript
interface IConfigRepository {
  load<T extends z.ZodType>(schema: T): z.infer<T>;
  get(key: string): unknown;
  getAllConfig(): Record<string, unknown>;
  validate<T extends z.ZodType>(data: unknown, schema: T): z.infer<T>;
  watch(listener: IConfigChangeListener): () => void;
  reload(): Promise<void>;
  dispose(): Promise<void>;
  getMetadata(): IRepositoryMetadata;
}
```

## Configuration Schema

The package includes comprehensive schemas for common configuration domains:

```typescript
// Database configuration
const dbConfig = {
  url: "postgresql://localhost:5432/axon",
  maxConnections: 20,
  ssl: true
};

// Service configuration  
const serviceConfig = {
  port: 3000,
  host: "localhost",
  cors: { origins: ["http://localhost:3000"] }
};

// Authentication configuration
const authConfig = {
  jwtSecret: "your-secret-key",
  tokenExpiration: "24h",
  providers: ["local", "oauth"]
};
```

## Environment Variables

Standard environment variable mappings:

- `NODE_ENV` - Application environment (development/production/test)
- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Service port number

## Testing

The package includes comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

## Performance

- **Object Pooling**: Reduces object allocation overhead
- **Validation Caching**: Caches validation results for repeated operations
- **Lazy Loading**: Configuration values loaded on-demand
- **Memory Efficiency**: Optimized for low memory footprint

## Security

- **Input Validation**: All configuration values validated with Zod schemas
- **Secret Management**: Secure handling of sensitive configuration data
- **Environment Isolation**: Clear separation between environment configurations
- **Type Safety**: Compile-time protection against configuration errors

## Contributing

This package follows Axon Flow development standards:

- TypeScript strict mode enabled
- Comprehensive test coverage required
- Zod schemas for all public APIs
- ESLint configuration compliance
- Provider pattern for external dependencies

## License

MIT - See LICENSE file for details.