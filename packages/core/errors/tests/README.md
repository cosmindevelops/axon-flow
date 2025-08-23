# Error Recovery Testing Infrastructure

This directory contains comprehensive testing infrastructure for error recovery mechanisms in the Axon Flow error handling system.

## 🎯 Performance Requirements

All recovery mechanisms must meet these strict performance requirements:

- **Individual Handler Overhead**: <1ms per operation
- **Circuit Breaker State Checks**: O(1) complexity
- **Retry Delay Calculations**: <0.1ms
- **Recovery Chain Processing**: <1ms total overhead

## 📁 Directory Structure

```
tests/
├── unit/
│   └── recovery/                    # Unit tests for individual handlers
│       ├── retry-handler.test.ts              # Retry mechanism tests
│       ├── circuit-breaker-handler.test.ts    # Circuit breaker tests
│       ├── graceful-degradation-handler.test.ts  # Fallback chain tests
│       ├── timeout-handler.test.ts            # Timeout management tests
│       └── recovery-manager.test.ts           # Central coordinator tests
├── integration/
│   └── recovery-chain.test.ts       # Handler chain integration tests
├── performance/
│   └── recovery-benchmark.test.ts   # Performance benchmarks
└── utils/
    └── recovery-test-utils.ts       # Testing utilities and helpers
```

## 🧪 Test Categories

### Unit Tests (`unit/recovery/`)

Each recovery handler has comprehensive unit tests covering:

#### RetryHandler Tests

- **Exponential Backoff**: Calculation accuracy with jitter support
- **Retry Eligibility**: Error categorization and retry conditions
- **Performance**: <0.1ms calculation time, <1ms total overhead
- **Edge Cases**: Zero delays, large retry counts, concurrent operations

#### CircuitBreakerHandler Tests

- **State Transitions**: CLOSED → OPEN → HALF_OPEN → CLOSED flows
- **Failure Counting**: Accurate failure rate calculation with sliding windows
- **Performance**: O(1) state checks, efficient memory usage
- **Concurrency**: Thread-safe state management

#### GracefulDegradationHandler Tests

- **Fallback Chain**: Priority-based execution with quality scoring
- **Caching**: Result caching with timeout management
- **Quality Calculation**: Accurate degradation scoring
- **Performance**: <1ms fallback execution, efficient cache operations

#### TimeoutHandler Tests

- **Non-blocking Timeouts**: Event loop friendly timeout implementation
- **Cancellation Support**: AbortController integration
- **Grace Periods**: Cleanup time allowances
- **Performance**: Minimal setup overhead, efficient cleanup

#### RecoveryManager Tests

- **Strategy Coordination**: Multiple recovery strategy orchestration
- **Policy Execution**: best_effort, fail_fast, priority_based policies
- **Concurrent Recovery**: Resource-limited concurrent operations
- **Performance**: <1ms coordination overhead, efficient strategy selection

### Integration Tests (`integration/`)

#### recovery-chain.test.ts

Tests complete error handler chain integration:

- **Handler Priority**: Execution order based on priority settings
- **Context Preservation**: Error context through recovery chain
- **Cascading Recovery**: Multiple handler coordination
- **Real-world Scenarios**: Microservice failures, database issues, rate limiting
- **Performance**: Complete chain processing within limits

### Performance Tests (`performance/`)

#### recovery-benchmark.test.ts

Comprehensive performance validation:

- **Individual Handler Performance**: Each handler within 1ms overhead
- **Concurrent Operations**: Scalability under load
- **Memory Efficiency**: Memory usage under sustained operations
- **High-throughput Scenarios**: 100+ errors/second processing
- **Stress Testing**: Performance under memory pressure

## 🛠️ Test Utilities (`utils/`)

### TestErrors

Predefined error instances for common scenarios:

```typescript
TestErrors.NETWORK_TIMEOUT;
TestErrors.SERVICE_UNAVAILABLE;
TestErrors.DATABASE_CONNECTION_FAILED;
TestErrors.AUTHENTICATION_FAILED;
TestErrors.VALIDATION_ERROR;
TestErrors.RATE_LIMIT_EXCEEDED;
TestErrors.CIRCUIT_BREAKER_OPEN;
```

### TestErrorFactory

Dynamic error creation with customization:

```typescript
TestErrorFactory.createNetworkError({ endpoint: "...", timeout: 5000 });
TestErrorFactory.createServiceError({ service: "user-service", statusCode: 503 });
TestErrorFactory.createErrorBatch(100); // Bulk error creation
```

### MockOperations

Configurable mock operations for testing:

```typescript
MockOperations.createSuccessOperation(result, delayMs);
MockOperations.createFailureOperation(error, delayMs);
MockOperations.createEventualSuccessOperation(failCount, result);
MockOperations.createIntermittentOperation(result, failureRate);
MockOperations.createTimeoutOperation(timeoutMs);
MockOperations.createCancellableOperation(result, duration);
```

### PerformanceMeasurement

High-resolution timing for benchmarks:

```typescript
const perf = new PerformanceMeasurement();
await perf.measure(async () => handler.recover(error));
const stats = perf.getStats(); // min, max, mean, p95, p99
```

### RecoveryScenarios

Real-world failure scenarios:

```typescript
RecoveryScenarios.createCascadeFailureScenario();
RecoveryScenarios.createDatabasePoolExhaustionScenario();
RecoveryScenarios.createRateLimitingScenario();
RecoveryScenarios.createNetworkPartitionScenario();
```

### MockRecoveryStrategies

Test-friendly strategy implementations:

```typescript
MockRecoveryStrategies.createMockRetry({ maxAttempts: 3 });
MockRecoveryStrategies.createMockCircuitBreaker({ failureThreshold: 5 });
MockRecoveryStrategies.createMockGracefulDegradation("fallback");
MockRecoveryStrategies.createMockTimeout({ timeoutMs: 5000 });
```

### TimeUtils

Time manipulation for time-dependent tests:

```typescript
TimeUtils.mockTime();
TimeUtils.advanceTime(60000); // Fast-forward 1 minute
TimeUtils.restoreTime();
```

## 🏃‍♂️ Running Tests

### All Recovery Tests

```bash
pnpm test tests/unit/recovery tests/integration/recovery-chain.test.ts tests/performance/recovery-benchmark.test.ts
```

### Individual Test Categories

```bash
# Unit tests only
pnpm test tests/unit/recovery

# Integration tests only
pnpm test tests/integration/recovery-chain.test.ts

# Performance benchmarks only
pnpm test tests/performance/recovery-benchmark.test.ts
```

### Specific Handler Tests

```bash
# Retry handler only
pnpm test tests/unit/recovery/retry-handler.test.ts

# Circuit breaker only
pnpm test tests/unit/recovery/circuit-breaker-handler.test.ts
```

### Watch Mode for TDD

```bash
pnpm test:watch tests/unit/recovery
```

## 🎯 TDD-Ready Structure

All test files are structured for immediate Test-Driven Development:

1. **Complete Test Skeletons**: All test cases defined with TODO placeholders
2. **Mock Imports**: Pre-configured mock imports ready for actual implementations
3. **Performance Scaffolding**: Timing and measurement infrastructure in place
4. **Edge Case Coverage**: Comprehensive scenario coverage including error conditions
5. **Integration Scenarios**: Real-world failure patterns ready for testing

## 📊 Test Coverage Expectations

- **Unit Tests**: >95% line coverage for individual handlers
- **Integration Tests**: Complete handler chain interaction coverage
- **Performance Tests**: All performance requirements validated
- **Edge Cases**: Error conditions, resource exhaustion, concurrent access
- **Real-world Scenarios**: Common production failure patterns

## 🔧 Implementation Workflow

1. **Implement Handler**: Create actual recovery handler class
2. **Replace Mocks**: Update test imports to use real implementations
3. **Run TDD Cycle**: Red → Green → Refactor with existing test structure
4. **Validate Performance**: Ensure all benchmarks pass
5. **Integration Testing**: Verify chain integration works correctly

## 📈 Performance Monitoring

Performance tests will fail if handlers exceed requirements:

- **Retry Calculations**: Must complete in <0.1ms
- **Circuit Breaker State**: O(1) complexity verified
- **Chain Processing**: Total overhead <1ms validated
- **Memory Usage**: Memory leak detection included
- **Concurrent Performance**: Scalability limits tested

## 🚀 Success Criteria

✅ **TDD-Ready**: Complete test structure for immediate development  
✅ **Performance-Focused**: <1ms overhead requirement built into all tests  
✅ **Real-world Scenarios**: Production failure patterns covered  
✅ **Integration-Complete**: Handler chain interactions fully tested  
✅ **Utility-Rich**: Comprehensive testing helpers and mocks provided

This testing infrastructure ensures that error recovery mechanisms will be robust, performant, and production-ready from day one of implementation.
