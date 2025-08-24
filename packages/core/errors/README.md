# @axon/errors

Enhanced error handling utilities with context preservation and comprehensive recovery mechanisms for Axon Flow.

## Features

- **Enhanced Error Hierarchy**: Structured error classes with correlation context and metadata
- **Error Recovery Mechanisms**: Chain of Responsibility pattern with retry, circuit breaker, timeout, and graceful degradation handlers
- **Type-Safe Error Handling**: Complete TypeScript support with Zod schema validation
- **Performance Optimized**: Object pooling and lazy evaluation for high-throughput scenarios
- **Cross-Platform**: Works in both Node.js and browser environments
- **Comprehensive Testing**: 243+ tests with performance benchmarks

## Installation

```bash
npm install @axon/errors
```

## Quick Start

### Basic Error Creation

```typescript
import { BaseAxonError, ErrorFactory, ValidationError } from '@axon/errors';

// Direct error creation
const error = new BaseAxonError(
  'Operation failed',
  'OPERATION_FAILED',
  { correlationId: 'req-123', userId: 'user-456' }
);

// Using factory
const factory = new ErrorFactory({ correlationId: 'req-123' });
const validationError = factory.validation('Invalid email format', 'INVALID_EMAIL');
```

### Error Recovery

```typescript
import { RecoveryManager, RetryHandler, CircuitBreakerHandler } from '@axon/errors';

// Create recovery manager with handlers
const recoveryManager = new RecoveryManager({
  defaultTimeout: 5000,
  enableMetrics: true
});

// Add recovery handlers
recoveryManager.addHandler(new RetryHandler({
  maxRetries: 3,
  backoffStrategy: BackoffStrategy.EXPONENTIAL,
  initialDelay: 100
}));

recoveryManager.addHandler(new CircuitBreakerHandler({
  failureThreshold: 5,
  resetTimeout: 60000
}));

// Execute operation with recovery
const result = await recoveryManager.execute(async () => {
  // Your operation that might fail
  return await riskyOperation();
}, {
  operationId: 'risky-op-123',
  timeout: 10000
});
```

## API Documentation

### Core Error Classes

#### BaseAxonError

The foundation error class with enhanced context and correlation support.

```typescript
class BaseAxonError extends Error {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>,
    options?: IBaseAxonErrorOptions
  )
}
```

**Properties:**
- `code: string` - Error code for programmatic handling
- `correlationId?: string` - Request correlation identifier
- `context: Record<string, unknown>` - Additional error context
- `severity: ErrorSeverity` - Error severity level
- `category: ErrorCategory` - Error category classification
- `timestamp: Date` - Error creation timestamp

### Error Categories

Pre-built error classes for common scenarios:

```typescript
// Authentication errors
const authError = new AuthenticationError('Invalid credentials', 'AUTH_FAILED', {
  method: AuthMethod.JWT,
  reason: AuthFailureReason.INVALID_TOKEN
});

// Validation errors
const validationError = new ValidationError('Invalid input', 'VALIDATION_FAILED', {
  field: 'email',
  value: 'invalid-email'
});

// Network errors
const networkError = new NetworkError('Connection timeout', 'NETWORK_TIMEOUT', {
  url: 'https://api.example.com',
  timeout: 5000
});
```

### Recovery Mechanisms

#### RetryHandler

Handles transient failures with configurable retry strategies:

```typescript
const retryHandler = new RetryHandler({
  maxRetries: 3,
  backoffStrategy: BackoffStrategy.EXPONENTIAL,
  initialDelay: 100,
  maxDelay: 5000,
  retryCondition: (error) => error instanceof NetworkError
});
```

#### CircuitBreakerHandler

Prevents cascade failures in distributed systems:

```typescript
const circuitBreaker = new CircuitBreakerHandler({
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 60000,
  monitorWindow: 10000
});
```

#### TimeoutHandler

Enforces operation timeouts:

```typescript
const timeoutHandler = new TimeoutHandler({
  defaultTimeout: 5000,
  enableTimeoutWarnings: true,
  warningThreshold: 0.8
});
```

#### GracefulDegradationHandler

Provides fallback mechanisms:

```typescript
const degradationHandler = new GracefulDegradationHandler({
  fallbackStrategies: new Map([
    ['SERVICE_UNAVAILABLE', async () => ({ data: [], cached: true })]
  ]),
  enableFallbackLogging: true
});
```

### Error Factories

#### Enhanced Error Factory

Type-safe error creation with context preservation:

```typescript
import { createEnhancedFactory } from '@axon/errors';

const factory = createEnhancedFactory({
  correlationId: 'req-123',
  userId: 'user-456',
  service: 'auth-service'
});

// Create categorized errors
const authError = factory.authentication('Login failed', 'AUTH_FAILED');
const validationError = factory.validation('Invalid input', 'VALIDATION_FAILED');
const networkError = factory.network('Connection failed', 'NETWORK_ERROR');
```

### Error Serialization

Cross-platform error serialization with metadata preservation:

```typescript
import { ErrorSerializer } from '@axon/errors';

const serializer = new ErrorSerializer({
  includeStackTrace: true,
  includeContext: true,
  redactSensitiveFields: ['password', 'token']
});

// Serialize error
const serialized = serializer.serialize(error);

// Deserialize error
const restored = serializer.deserialize(serialized);
```

## Advanced Usage

### Custom Error Categories

```typescript
import { BaseAxonError } from '@axon/errors';

class CustomBusinessError extends BaseAxonError {
  constructor(message: string, code: string, businessContext?: Record<string, unknown>) {
    super(message, code, businessContext, {
      category: ErrorCategory.BUSINESS,
      severity: ErrorSeverity.MEDIUM
    });
  }
}
```

### Error Handler Chain

```typescript
import { ErrorHandlerChain, BaseEnhancedErrorHandler } from '@axon/errors';

class CustomHandler extends BaseEnhancedErrorHandler {
  async handle(error: IBaseAxonError): Promise<IHandlerResult> {
    // Custom handling logic
    return {
      handled: true,
      modified: false,
      error,
      metadata: { customField: 'value' }
    };
  }
}

const chain = new ErrorHandlerChain();
chain.addHandler(new CustomHandler());
const result = await chain.process(error);
```

### Performance Monitoring

```typescript
import { RecoveryManager } from '@axon/errors';

const recoveryManager = new RecoveryManager({
  enableMetrics: true,
  metricsCallback: (metrics) => {
    console.log('Recovery metrics:', {
      operationId: metrics.operationId,
      duration: metrics.executionTime,
      attempts: metrics.attemptCount,
      success: metrics.success
    });
  }
});
```

## Configuration

### Environment Variables

- `AXON_ERROR_ENABLE_STACK_TRACES`: Enable detailed stack traces (default: true in development)
- `AXON_ERROR_LOG_LEVEL`: Minimum log level for error logging (default: 'info')
- `AXON_ERROR_METRICS_ENABLED`: Enable performance metrics collection (default: false)

### Type Configuration

```typescript
// Configure correlation ID type
declare module '@axon/errors' {
  interface ICorrelationContext {
    requestId: string;
    userId?: string;
    sessionId?: string;
  }
}
```

## Performance Characteristics

- **Error Creation**: Sub-millisecond average (0.009ms)
- **Recovery Operations**: Microsecond-level overhead
- **Memory Usage**: ~2KB per error instance
- **Concurrency**: Handles 10,000+ concurrent operations

## Browser Compatibility

Fully compatible with modern browsers supporting ES2020+:
- Chrome 80+
- Firefox 72+
- Safari 14+
- Edge 80+

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance

# Watch mode
npm run test:watch
```

## Contributing

1. Follow the existing code patterns and TypeScript strict mode
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure performance benchmarks pass

## License

MIT License - see LICENSE file for details.

## Related Packages

- `@axon/logger` - Structured logging with error integration
- `@axon/config` - Configuration management with validation
- `@axon/types` - Shared TypeScript type definitions