/**
 * Test utilities for error recovery mechanism testing
 * Provides common scenarios, mocks, and helper functions
 */

import { vi } from "vitest";
import { BaseAxonError } from "../../src/base/base-error.classes.js";
import { ErrorCategory, ErrorSeverity } from "../../src/base/base-error.types.js";

/**
 * Collection of predefined test errors for common scenarios
 */
export const TestErrors = {
  NETWORK_TIMEOUT: new BaseAxonError("Network operation timed out", "NET_TIMEOUT", {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    metadata: {
      endpoint: "https://api.example.com/data",
      timeout: 5000,
      attempt: 1,
    },
  }),

  SERVICE_UNAVAILABLE: new BaseAxonError("External service unavailable", "SERVICE_DOWN", {
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.ERROR,
    metadata: {
      service: "user-service",
      statusCode: 503,
      retryAfter: 60,
    },
  }),

  DATABASE_CONNECTION_FAILED: new BaseAxonError("Database connection failed", "DB_CONN_FAIL", {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    metadata: {
      host: "localhost",
      port: 5432,
      database: "test_db",
      connectionPool: "exhausted",
    },
  }),

  AUTHENTICATION_FAILED: new BaseAxonError("Authentication failed", "AUTH_FAILED", {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.ERROR,
    metadata: {
      userId: "user123",
      reason: "invalid_token",
      tokenExpired: true,
    },
  }),

  VALIDATION_ERROR: new BaseAxonError("Input validation failed", "VALIDATION_ERROR", {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    metadata: {
      field: "email",
      value: "invalid-email",
      constraint: "email_format",
    },
  }),

  RATE_LIMIT_EXCEEDED: new BaseAxonError("Rate limit exceeded", "RATE_LIMITED", {
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.WARNING,
    metadata: {
      limit: 1000,
      window: 3600,
      remaining: 0,
      resetTime: Date.now() + 3600000,
    },
  }),

  CIRCUIT_BREAKER_OPEN: new BaseAxonError("Circuit breaker is open", "CIRCUIT_OPEN", {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    metadata: {
      circuitName: "external-api",
      failureCount: 5,
      lastFailureTime: Date.now() - 30000,
    },
  }),
} as const;

/**
 * Factory for creating test errors with variations
 */
export class TestErrorFactory {
  /**
   * Create a network error with customizable properties
   */
  static createNetworkError(
    overrides?: Partial<{
      message: string;
      code: string;
      endpoint: string;
      timeout: number;
      statusCode: number;
    }>,
  ): BaseAxonError {
    return new BaseAxonError(overrides?.message ?? "Network request failed", overrides?.code ?? "NETWORK_ERROR", {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.WARNING,
      metadata: {
        endpoint: overrides?.endpoint ?? "https://api.example.com",
        timeout: overrides?.timeout ?? 5000,
        statusCode: overrides?.statusCode ?? 0,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Create a service error with customizable properties
   */
  static createServiceError(
    overrides?: Partial<{
      service: string;
      statusCode: number;
      retryable: boolean;
    }>,
  ): BaseAxonError {
    return new BaseAxonError(`Service ${overrides?.service ?? "unknown"} is unavailable`, "SERVICE_ERROR", {
      category: ErrorCategory.EXTERNAL_SERVICE,
      severity: ErrorSeverity.ERROR,
      metadata: {
        service: overrides?.service ?? "unknown-service",
        statusCode: overrides?.statusCode ?? 500,
        retryable: overrides?.retryable ?? true,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Create a timeout error with customizable timeout value
   */
  static createTimeoutError(timeoutMs?: number): BaseAxonError {
    return new BaseAxonError(`Operation timed out after ${timeoutMs ?? 30000}ms`, "TIMEOUT", {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.WARNING,
      metadata: {
        timeout: timeoutMs ?? 30000,
        startTime: Date.now() - (timeoutMs ?? 30000),
        endTime: Date.now(),
      },
    });
  }

  /**
   * Create a batch of similar errors for testing
   */
  static createErrorBatch(count: number, baseError?: BaseAxonError): BaseAxonError[] {
    const base = baseError ?? TestErrors.NETWORK_TIMEOUT;
    return Array.from(
      { length: count },
      (_, i) =>
        new BaseAxonError(`${base.message} #${i}`, `${base.code}_${i}`, {
          ...base.context,
          metadata: {
            ...base.context.metadata,
            batchIndex: i,
            timestamp: Date.now() + i,
          },
        }),
    );
  }
}

/**
 * Mock operation factories for testing recovery mechanisms
 */
export class MockOperations {
  /**
   * Create a mock operation that always succeeds
   */
  static createSuccessOperation<T>(result: T, delayMs = 0): () => Promise<T> {
    return vi.fn().mockImplementation(async () => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return result;
    });
  }

  /**
   * Create a mock operation that always fails
   */
  static createFailureOperation(error: Error, delayMs = 0): () => Promise<never> {
    return vi.fn().mockImplementation(async () => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      throw error;
    });
  }

  /**
   * Create a mock operation that fails N times then succeeds
   */
  static createEventualSuccessOperation<T>(failureCount: number, result: T, error?: Error): () => Promise<T> {
    let attempts = 0;
    const failureError = error ?? TestErrors.NETWORK_TIMEOUT;

    return vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts <= failureCount) {
        throw failureError;
      }
      return result;
    });
  }

  /**
   * Create a mock operation with intermittent failures
   */
  static createIntermittentOperation<T>(result: T, failureRate = 0.3, error?: Error): () => Promise<T> {
    const failureError = error ?? TestErrors.SERVICE_UNAVAILABLE;

    return vi.fn().mockImplementation(async () => {
      if (Math.random() < failureRate) {
        throw failureError;
      }
      return result;
    });
  }

  /**
   * Create a mock operation that times out
   */
  static createTimeoutOperation(timeoutMs: number): () => Promise<never> {
    return vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs * 2));
      throw TestErrorFactory.createTimeoutError(timeoutMs);
    });
  }

  /**
   * Create a cancellable mock operation
   */
  static createCancellableOperation<T>(result: T, operationDuration = 1000): (signal?: AbortSignal) => Promise<T> {
    return vi.fn().mockImplementation(async (signal?: AbortSignal) => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => resolve(result), operationDuration);

        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("Operation cancelled"));
          });
        }
      });
    });
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurement {
  private measurements: number[] = [];

  /**
   * Measure execution time of a function
   */
  async measure<T>(fn: () => Promise<T> | T): Promise<T> {
    const startTime = process.hrtime.bigint();
    const result = await fn();
    const endTime = process.hrtime.bigint();

    const durationMs = Number(endTime - startTime) / 1_000_000;
    this.measurements.push(durationMs);

    return result;
  }

  /**
   * Get statistics from all measurements
   */
  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;

    return {
      count: sorted.length,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      mean,
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p90: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }

  /**
   * Reset measurements
   */
  reset(): void {
    this.measurements = [];
  }
}

/**
 * Recovery scenario test helpers
 */
export class RecoveryScenarios {
  /**
   * Test scenario: Microservice cascade failure
   */
  static createCascadeFailureScenario() {
    return {
      name: "Microservice Cascade Failure",
      description: "Multiple dependent services failing in sequence",
      errors: [
        TestErrorFactory.createServiceError({ service: "user-service", statusCode: 503 }),
        TestErrorFactory.createServiceError({ service: "auth-service", statusCode: 502 }),
        TestErrorFactory.createServiceError({ service: "data-service", statusCode: 504 }),
      ],
      expectedRecoveryStrategies: ["retry", "circuit_breaker", "graceful_degradation"],
      maxAcceptableRecoveryTime: 5000,
    };
  }

  /**
   * Test scenario: Database connection pool exhaustion
   */
  static createDatabasePoolExhaustionScenario() {
    return {
      name: "Database Pool Exhaustion",
      description: "Database connection pool is exhausted under high load",
      errors: [
        new BaseAxonError("Connection pool exhausted", "DB_POOL_EXHAUSTED", {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.CRITICAL,
          metadata: {
            poolSize: 20,
            activeConnections: 20,
            waitingRequests: 50,
          },
        }),
      ],
      expectedRecoveryStrategies: ["timeout", "retry", "circuit_breaker"],
      maxAcceptableRecoveryTime: 10000,
    };
  }

  /**
   * Test scenario: API rate limiting
   */
  static createRateLimitingScenario() {
    return {
      name: "API Rate Limiting",
      description: "External API rate limits being exceeded",
      errors: [TestErrors.RATE_LIMIT_EXCEEDED],
      expectedRecoveryStrategies: ["retry", "graceful_degradation"],
      maxAcceptableRecoveryTime: 65000, // Should wait for rate limit reset
    };
  }

  /**
   * Test scenario: Network partition
   */
  static createNetworkPartitionScenario() {
    return {
      name: "Network Partition",
      description: "Temporary network connectivity issues",
      errors: [
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
        TestErrorFactory.createNetworkError({ statusCode: 0, timeout: 30000 }),
      ],
      expectedRecoveryStrategies: ["retry", "timeout", "circuit_breaker"],
      maxAcceptableRecoveryTime: 120000,
    };
  }
}

/**
 * Mock recovery strategy implementations for testing
 */
export class MockRecoveryStrategies {
  /**
   * Create a mock retry strategy
   */
  static createMockRetry(config?: { maxAttempts?: number; shouldSucceedOnAttempt?: number }) {
    let attempts = 0;

    return {
      name: "MockRetryHandler",
      recover: vi.fn().mockImplementation(async (error: BaseAxonError) => {
        attempts++;

        if (config?.shouldSucceedOnAttempt && attempts >= config.shouldSucceedOnAttempt) {
          return {
            recovered: true,
            strategy: "retry",
            attempts,
            value: "retry_success",
          };
        }

        if (attempts >= (config?.maxAttempts ?? 3)) {
          throw new Error(`Retry failed after ${attempts} attempts`);
        }

        throw error;
      }),
      getAttempts: () => attempts,
      reset: () => {
        attempts = 0;
      },
    };
  }

  /**
   * Create a mock circuit breaker strategy
   */
  static createMockCircuitBreaker(config?: { failureThreshold?: number; recoveryTime?: number }) {
    let failureCount = 0;
    let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
    let lastFailureTime = 0;

    return {
      name: "MockCircuitBreakerHandler",
      recover: vi.fn().mockImplementation(async (error: BaseAxonError) => {
        const threshold = config?.failureThreshold ?? 5;
        const recoveryTime = config?.recoveryTime ?? 30000;

        if (state === "OPEN") {
          if (Date.now() - lastFailureTime > recoveryTime) {
            state = "HALF_OPEN";
          } else {
            throw new Error("Circuit breaker is OPEN");
          }
        }

        if (state === "HALF_OPEN") {
          // Simulate successful recovery
          state = "CLOSED";
          failureCount = 0;
          return {
            recovered: true,
            strategy: "circuit_breaker",
            state: "CLOSED",
            value: "circuit_breaker_recovery",
          };
        }

        // Simulate failure
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= threshold) {
          state = "OPEN";
        }

        throw error;
      }),
      getState: () => state,
      getFailureCount: () => failureCount,
      reset: () => {
        failureCount = 0;
        state = "CLOSED";
        lastFailureTime = 0;
      },
    };
  }

  /**
   * Create a mock graceful degradation strategy
   */
  static createMockGracefulDegradation(fallbackValue: any = "fallback_result") {
    return {
      name: "MockGracefulDegradationHandler",
      recover: vi.fn().mockImplementation(async (error: BaseAxonError) => {
        // Simulate fallback logic
        const quality = 0.7; // Reduced quality fallback

        return {
          recovered: true,
          strategy: "graceful_degradation",
          quality,
          value: fallbackValue,
          fallbackUsed: "emergency_fallback",
        };
      }),
      addFallback: vi.fn(),
      getFallbacks: vi.fn().mockReturnValue([]),
    };
  }

  /**
   * Create a mock timeout strategy
   */
  static createMockTimeout(config?: { timeoutMs?: number }) {
    return {
      name: "MockTimeoutHandler",
      recover: vi.fn().mockImplementation(async (error: BaseAxonError) => {
        const timeoutMs = config?.timeoutMs ?? 5000;

        return {
          recovered: true,
          strategy: "timeout",
          timeoutApplied: timeoutMs,
          value: "timeout_handled",
        };
      }),
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    };
  }
}

/**
 * Test assertion helpers
 */
export class RecoveryAssertions {
  /**
   * Assert that recovery result meets expected criteria
   */
  static assertRecoveryResult(
    result: any,
    expected: {
      recovered?: boolean;
      strategy?: string;
      attempts?: number;
      qualityScore?: number;
      timeWithinLimit?: number;
    },
  ) {
    if (expected.recovered !== undefined) {
      expect(result.recovered).toBe(expected.recovered);
    }

    if (expected.strategy) {
      expect(result.strategy).toBe(expected.strategy);
    }

    if (expected.attempts !== undefined) {
      expect(result.attempts).toBe(expected.attempts);
    }

    if (expected.qualityScore !== undefined) {
      expect(result.qualityScore).toBeCloseTo(expected.qualityScore, 2);
    }

    if (expected.timeWithinLimit !== undefined) {
      expect(result.executionTime).toBeLessThan(expected.timeWithinLimit);
    }
  }

  /**
   * Assert that performance metrics meet requirements
   */
  static assertPerformanceRequirements(
    stats: any,
    requirements: {
      maxMeanTime?: number;
      maxP95Time?: number;
      maxP99Time?: number;
      minThroughput?: number;
    },
  ) {
    if (requirements.maxMeanTime !== undefined) {
      expect(stats.mean).toBeLessThan(requirements.maxMeanTime);
    }

    if (requirements.maxP95Time !== undefined) {
      expect(stats.p95).toBeLessThan(requirements.maxP95Time);
    }

    if (requirements.maxP99Time !== undefined) {
      expect(stats.p99).toBeLessThan(requirements.maxP99Time);
    }

    if (requirements.minThroughput !== undefined && stats.throughput !== undefined) {
      expect(stats.throughput).toBeGreaterThan(requirements.minThroughput);
    }
  }
}

/**
 * Test data generators
 */
export class TestDataGenerators {
  /**
   * Generate a series of errors with different patterns
   */
  static generateErrorPattern(
    pattern: "increasing_severity" | "alternating" | "burst",
    count: number,
  ): BaseAxonError[] {
    switch (pattern) {
      case "increasing_severity":
        return Array.from({ length: count }, (_, i) => {
          const severities = [ErrorSeverity.INFO, ErrorSeverity.WARNING, ErrorSeverity.ERROR, ErrorSeverity.CRITICAL];
          const severity = severities[Math.min(Math.floor(i / 2), severities.length - 1)];
          return new BaseAxonError(`Error ${i}`, `ERROR_${i}`, { severity });
        });

      case "alternating":
        return Array.from({ length: count }, (_, i) => {
          const isNetwork = i % 2 === 0;
          return isNetwork
            ? TestErrorFactory.createNetworkError({ code: `NET_${i}` })
            : TestErrorFactory.createServiceError({ service: `service_${i}` });
        });

      case "burst":
        const burstSize = 5;
        return Array.from({ length: count }, (_, i) => {
          const burstIndex = Math.floor(i / burstSize);
          const categories = Object.values(ErrorCategory);
          const category = categories[burstIndex % categories.length];

          return new BaseAxonError(`Burst error ${i}`, `BURST_${i}`, {
            category: category as ErrorCategory,
            metadata: { burstIndex, position: i % burstSize },
          });
        });

      default:
        throw new Error(`Unknown pattern: ${pattern}`);
    }
  }

  /**
   * Generate load test data
   */
  static generateLoadTestData(concurrent: number, total: number) {
    const batches: BaseAxonError[][] = [];
    let remaining = total;

    while (remaining > 0) {
      const batchSize = Math.min(concurrent, remaining);
      const batch = TestErrorFactory.createErrorBatch(batchSize);
      batches.push(batch);
      remaining -= batchSize;
    }

    return batches;
  }
}

/**
 * Time manipulation utilities for testing
 */
export class TimeUtils {
  private static realSetTimeout = setTimeout;
  private static realClearTimeout = clearTimeout;
  private static realDateNow = Date.now;

  private static currentTime = Date.now();
  private static timeouts: Map<NodeJS.Timeout, { callback: () => void; triggerTime: number }> = new Map();

  /**
   * Mock time for testing time-dependent recovery mechanisms
   */
  static mockTime() {
    this.currentTime = Date.now();
    this.timeouts.clear();

    // Mock setTimeout
    global.setTimeout = vi.fn().mockImplementation((callback: () => void, delay: number) => {
      const timeoutId = {} as NodeJS.Timeout;
      this.timeouts.set(timeoutId, {
        callback,
        triggerTime: this.currentTime + delay,
      });
      return timeoutId;
    });

    // Mock clearTimeout
    global.clearTimeout = vi.fn().mockImplementation((timeoutId: NodeJS.Timeout) => {
      this.timeouts.delete(timeoutId);
    });

    // Mock Date.now
    Date.now = vi.fn().mockImplementation(() => this.currentTime);
  }

  /**
   * Advance mocked time and trigger pending timeouts
   */
  static advanceTime(ms: number) {
    this.currentTime += ms;

    const triggeredTimeouts: Array<{ callback: () => void; triggerTime: number }> = [];

    for (const [timeoutId, timeout] of this.timeouts.entries()) {
      if (timeout.triggerTime <= this.currentTime) {
        triggeredTimeouts.push(timeout);
        this.timeouts.delete(timeoutId);
      }
    }

    // Execute triggered timeouts
    triggeredTimeouts.sort((a, b) => a.triggerTime - b.triggerTime).forEach((timeout) => timeout.callback());
  }

  /**
   * Restore real time functions
   */
  static restoreTime() {
    global.setTimeout = this.realSetTimeout;
    global.clearTimeout = this.realClearTimeout;
    Date.now = this.realDateNow;
    this.timeouts.clear();
  }
}
