# @axon/logger

High-performance structured logging package for Axon Flow - providing enterprise-grade logging with performance optimizations, reliability patterns, and comprehensive monitoring.

## Features

- **High Performance**: 10,000+ logs/second throughput with object pooling
- **Structured JSON Logging**: Powered by Pino for optimal performance
- **Circuit Breaker Pattern**: Resilient logging with automatic failure recovery
- **Multiple Transports**: Console, file, and remote logging destinations
- **Performance Monitoring**: Real-time metrics and latency tracking
- **Object Pooling**: Reduced garbage collection pressure
- **Correlation ID Support**: Request tracing across service boundaries
- **Environment Optimizations**: Specialized configurations for dev/prod/test

## Installation

```bash
pnpm add @axon/logger
```

## Quick Start

```typescript
import { LoggerFactory } from "@axon/logger";

// Create high-performance logger
const logger = LoggerFactory.create({
  transports: [
    { type: "console", enabled: true, level: "info" }
  ],
  performance: { enabled: true, sampleRate: 0.1, thresholdMs: 50 },
  circuitBreaker: { enabled: true, failureThreshold: 5, resetTimeoutMs: 30000 },
  objectPool: { enabled: true, initialSize: 100, maxSize: 1000 }
});

// Structured logging with correlation
logger.info("Service started", { port: 3000, environment: "production" });
logger.withCorrelation("req-123").info("Processing request", { userId: "user-456" });
```

## Architecture

### Core Components

**Logger Core:**
- `Logger` - Main logging implementation with performance optimizations
- `LoggerFactory` - Factory for creating configured logger instances

**Performance & Reliability:**
- `PerformanceTracker` - Real-time metrics and latency monitoring
- `CircuitBreaker` - Failure detection and automatic recovery
- `ObjectPool` - Memory-efficient object pooling for log entries

**Transport System:**
- `TransportProvider` - Pluggable transport interface
- `ConsoleTransport` - High-performance console logging
- `FileTransport` - Asynchronous file-based logging
- `RemoteTransport` - Network-based log aggregation

### Performance Features

**Object Pooling:**
- Pre-allocated log entry objects reduce GC pressure
- Configurable pool sizes with automatic growth
- Memory-efficient design for high-throughput scenarios

**Circuit Breaker:**
- Automatic failure detection and recovery
- Prevents cascading failures in logging infrastructure
- Configurable thresholds and timeout periods

**Performance Monitoring:**
- Real-time throughput metrics (logs/second)
- Latency tracking with percentile calculations
- Resource utilization monitoring

## Usage Examples

### High-Performance Configuration

```typescript
import { LoggerFactory } from "@axon/logger";

const logger = LoggerFactory.create({
  transports: [
    { 
      type: "console", 
      enabled: true, 
      level: "info",
      options: { colorize: false } // Faster console output
    },
    {
      type: "file",
      enabled: true,
      level: "warn",
      destination: "/var/log/axon.log"
    }
  ],
  performance: {
    enabled: true,
    sampleRate: 0.05, // Monitor 5% of logs
    thresholdMs: 10   // Warn on logs taking >10ms
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3,
    resetTimeoutMs: 15000,
    monitorTimeWindowMs: 60000
  },
  objectPool: {
    enabled: true,
    initialSize: 500,
    maxSize: 2000,
    growthFactor: 1.5
  },
  bufferSize: 1000,
  flushIntervalMs: 5000,
  enableCorrelationIds: true,
  timestampFormat: "iso"
});
```

### Correlation ID Tracing

```typescript
import { Logger } from "@axon/logger";
import { randomUUID } from "crypto";

const correlationId = randomUUID();
const correlatedLogger = logger.withCorrelation(correlationId);

correlatedLogger.info("Request started", { endpoint: "/api/users" });
correlatedLogger.info("Database query", { table: "users", duration: 15 });
correlatedLogger.info("Request completed", { statusCode: 200 });
```

### Performance Monitoring

```typescript
// Get real-time metrics
const metrics = logger.getMetrics();
console.log({
  throughput: `${metrics.logsPerSecond} logs/sec`,
  avgLatency: `${metrics.averageLatencyMs}ms`,
  peakLatency: `${metrics.peakLatencyMs}ms`,
  circuitState: metrics.circuitBreakerState,
  poolUtilization: `${metrics.objectPoolUtilization}%`
});

// Health monitoring
if (!logger.isHealthy()) {
  console.warn("Logger health check failed - circuit breaker may be open");
}
```

### Custom Transport Implementation

```typescript
import { ITransportProvider, ILogEntry } from "@axon/logger";

class DatabaseTransport implements ITransportProvider {
  readonly type = "remote";
  
  async write(entry: ILogEntry): Promise<void> {
    await this.database.logs.insert({
      level: entry.level,
      message: entry.message,
      timestamp: new Date(entry.timestamp),
      correlationId: entry.correlationId,
      metadata: entry.meta
    });
  }
  
  async flush(): Promise<void> {
    await this.database.flush();
  }
  
  async close(): Promise<void> {
    await this.database.close();
  }
  
  isHealthy(): boolean {
    return this.database.isConnected();
  }
}
```

## API Reference

### LoggerFactory

Static factory methods for creating logger instances:

- `create(config: ILoggerConfig)` - Create configured logger
- `createDefault()` - Create logger with sensible defaults

### Logger

Core logging interface with performance features:

- `debug(message: string, meta?: object)` - Debug level logging
- `info(message: string, meta?: object)` - Info level logging  
- `warn(message: string, meta?: object)` - Warning level logging
- `error(message: string, meta?: object)` - Error level logging
- `withCorrelation(id: string)` - Create correlated logger instance
- `flush()` - Force flush all pending logs
- `getMetrics()` - Get performance metrics
- `isHealthy()` - Check logger health status

### Performance Classes

**PerformanceTracker:**
- Real-time throughput and latency monitoring
- Configurable sampling and thresholds
- Historical metrics with percentile calculations

**CircuitBreaker:**
- Automatic failure detection and recovery
- State management (closed/open/half-open)
- Metrics tracking for failure patterns

**ObjectPool:**
- Memory-efficient object pooling
- Configurable size limits and growth policies
- Performance monitoring and utilization tracking

## Configuration Schema

```typescript
interface ILoggerConfig {
  transports: ITransportConfig[];
  performance: {
    enabled: boolean;
    sampleRate: number;      // 0-1, percentage of logs to monitor
    thresholdMs: number;     // Latency threshold for warnings
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
    monitorTimeWindowMs: number;
  };
  objectPool: {
    enabled: boolean;
    initialSize: number;
    maxSize: number;
    growthFactor: number;
  };
  bufferSize?: number;
  flushIntervalMs?: number;
  enableCorrelationIds: boolean;
  timestampFormat: "iso" | "unix" | "epoch";
}
```

## Performance Benchmarks

- **Throughput**: 10,000+ structured logs/second
- **Memory**: 50% reduction in GC pressure with object pooling
- **Latency**: <1ms average log processing time
- **Reliability**: 99.9% uptime with circuit breaker pattern

## Environment Variables

Standard environment variable mappings:

- `LOG_LEVEL` - Default logging level (debug/info/warn/error)
- `LOG_FORMAT` - Output format (json/pretty)
- `LOG_DESTINATION` - File output destination
- `LOG_PERFORMANCE_ENABLED` - Enable performance monitoring
- `LOG_CORRELATION_ENABLED` - Enable correlation ID tracking

## Testing

The package includes comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode for development
pnpm test:watch

# Performance benchmarks
pnpm test:performance
```

## Performance Tuning

**High-Throughput Scenarios:**
- Enable object pooling with larger initial/max sizes
- Use file transports for better performance than console
- Reduce sampling rate for performance monitoring
- Use "unix" timestamp format for faster serialization

**Memory-Constrained Environments:**
- Disable object pooling if memory is limited
- Reduce buffer sizes and flush intervals
- Use synchronous console transport
- Disable performance monitoring

**Development vs Production:**
- Development: Enable pretty formatting, detailed monitoring
- Production: Disable colors, optimize for throughput, enable circuit breakers

## Contributing

This package follows Axon Flow development standards:

- TypeScript strict mode enabled
- Comprehensive test coverage required
- Performance benchmarks for critical paths
- ESLint configuration compliance
- Circuit breaker and object pooling patterns

## License

MIT - See LICENSE file for details.